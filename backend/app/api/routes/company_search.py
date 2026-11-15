import os
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.auth import authorize_org_member
from app.api.routes.jobs import broadcast_job_webhook
from app.api.routes.write_email import revert_company_status_to_pending
from app.core.arq_config import enqueue_arq_job
from app.langgraph.company_finder.graph import run_prospect_workflow
from app.services.supabase import get_supabase_client

router = APIRouter()

ORGANIZATIONS_TABLE = os.environ.get("SUPABASE_ORGANIZATIONS_TABLE_NAME", "organizations")
COMPANIES_TABLE = os.environ.get("SUPABASE_COMPANIES_TABLE_NAME", "companies")
PENDING_STATUS = "pending_review"
MAX_STALLED_RUNS = 3


class SearchCompanyRequest(BaseModel):
    token: str
    org_id: str


async def _get_threshold(org_id: str) -> int:
    supabase = await get_supabase_client()
    response = await (
        supabase
        .table(ORGANIZATIONS_TABLE)
        .select("pending_threshold")
        .eq("id", org_id)
        .single()
        .execute()
    )
    return response.data.get("pending_threshold", 10) if response.data else 10


async def _count_pending(org_id: str) -> int:
    supabase = await get_supabase_client()
    response = await (
        supabase
        .table(COMPANIES_TABLE)
        .select("id", count="exact")
        .eq("org_id", org_id)
        .in_("status", ["pending_review", "discovered", "enriched"])
        .execute()
    )
    return response.count or 0


async def _search_until_threshold(user_id: str, org_id: str, threshold: int) -> bool:
    """Run the company-finder graph until pending companies reach the threshold."""
    stalled = 0
    initial_pending = await _count_pending(org_id)
    pending = initial_pending

    while pending < threshold and stalled < MAX_STALLED_RUNS:
        await run_prospect_workflow(user_id, org_id)
        new_pending = await _count_pending(org_id)
        stalled = stalled + 1 if new_pending <= pending else 0
        pending = new_pending

    return pending > initial_pending or pending >= threshold


@router.post("/search-company")
async def search_company(body: SearchCompanyRequest):
    """Authenticate member, enqueue autonomous company finder job to ARQ, and send 'started' webhook.
    The company search route is ONLY executed if there is no company pending (pending count == 0).
    """
    user_id = await authorize_org_member(body.token, body.org_id)

    threshold = await _get_threshold(body.org_id)
    pending = await _count_pending(body.org_id)
    if pending > 0:
        return {"status": "threshold_met", "pending": pending, "threshold": threshold}

    job_id = await enqueue_arq_job(
        "search_companies_arq_task",
        user_id,
        body.org_id,
        threshold,
    )
    if job_id is None:
        raise HTTPException(status_code=503, detail="Failed to enqueue company search job in Redis")

    await broadcast_job_webhook(
        {
            "job_id": job_id,
            "task_name": "search_companies_arq_task",
            "org_id": body.org_id,
            "company_id": None,
            "status": "started",
            "message": "Company search started. Discovering target companies...",
            "error": None,
            "timestamp": time.time(),
        }
    )

    return {
        "status": "queued",
        "message": "Company search started. Discovering target companies...",
        "job_id": job_id,
        "pending": pending,
        "threshold": threshold,
    }


async def _trigger_search_if_below_threshold(user_id: str, org_id: str) -> Optional[str]:
    """Check pending count and trigger company search workflow only if no pending companies remain (count == 0)."""
    try:
        pending = await _count_pending(org_id)
        threshold = await _get_threshold(org_id)
        if pending == 0:
            job_id = await enqueue_arq_job(
                "search_companies_arq_task",
                user_id,
                org_id,
                threshold,
            )
            if job_id:
                await broadcast_job_webhook(
                    {
                        "job_id": job_id,
                        "task_name": "search_companies_arq_task",
                        "org_id": org_id,
                        "company_id": None,
                        "status": "started",
                        "message": "Company search started. Discovering target companies...",
                        "error": None,
                        "timestamp": time.time(),
                    }
                )
                return job_id
    except Exception as e:
        print(f"Warning: Failed to trigger company search refill: {e}")
    return None


class UpdateCompanyStatusRequest(BaseModel):
    token: str
    org_id: str
    company_id: str
    status: str
    user_id: Optional[str] = None
    recipient_emails: Optional[List[str]] = None
    org_domain: Optional[str] = None
    feedback: Optional[str] = None


PENDING_STATUSES = frozenset({"pending_review", "discovered", "enriched"})


@router.post("/company-status")
async def update_company_status(body: UpdateCompanyStatusRequest):
    """Update company status with strict backend workflow enforcement:
    1. If status is other than pending, throw error: 'status already assigned'.
    2. If accepted ('approved'): make status accepted, trigger email generation agent,
       and trigger company search refill if pending < threshold. If agent enqueue fails,
       reassign status back to pending.
    3. If rejected ('rejected'): assign status to rejected, mark emails rejected, and
       trigger company search refill if pending < threshold.
    """
    authenticated_user_id = await authorize_org_member(body.token, body.org_id)
    effective_user_id = body.user_id or authenticated_user_id

    requested_status = str(body.status).strip().lower()
    if requested_status not in ("approved", "rejected"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid review status: '{body.status}'. Only 'approved' or 'rejected' are allowed.",
        )

    supabase = await get_supabase_client()
    res = await (
        supabase.table(COMPANIES_TABLE)
        .select("id, org_id, status, name")
        .eq("id", body.company_id)
        .eq("org_id", body.org_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Company not found in organization.")

    company = res.data[0]
    current_status = str(company.get("status") or "").strip().lower()

    # Rule: If company is in any status other than pending, throw 'status already assigned'
    if current_status not in PENDING_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"status already assigned: company '{company.get('name', body.company_id)}' is currently '{current_status}'.",
        )

    # 1. Handle Accept (approved)
    if requested_status == "approved":
        # Make the status accepted in DB
        await (
            supabase.table(COMPANIES_TABLE)
            .update({"status": "approved"})
            .eq("id", body.company_id)
            .eq("org_id", body.org_id)
            .execute()
        )

        # Trigger the email writer agent in background worker
        email_job_id = await enqueue_arq_job(
            "write_email_arq_task",
            effective_user_id,
            body.org_id,
            body.company_id,
            body.feedback,
            body.recipient_emails,
            body.org_domain,
        )

        if email_job_id is None:
            # Reassign status to pending if agent cannot be enqueued
            await revert_company_status_to_pending(body.company_id, body.org_id)
            raise HTTPException(
                status_code=503,
                detail="Failed to enqueue email generation job in Redis; reverted company status to pending.",
            )

        await broadcast_job_webhook(
            {
                "job_id": email_job_id,
                "task_name": "write_email_arq_task",
                "org_id": body.org_id,
                "company_id": body.company_id,
                "status": "started",
                "message": "Outreach email generation started...",
                "error": None,
                "timestamp": time.time(),
            }
        )

        # Trigger company search workflow if pending count is below threshold
        search_job_id = await _trigger_search_if_below_threshold(
            user_id=effective_user_id,
            org_id=body.org_id,
        )

        return {
            "status": "success",
            "company_id": body.company_id,
            "previous_status": current_status,
            "current_status": "approved",
            "email_job_id": email_job_id,
            "search_job_id": search_job_id,
            "message": "Company accepted. Email generation agent triggered.",
        }

    # 2. Handle Reject (rejected)
    else:
        # Simple assign the status to rejected in DB
        await (
            supabase.table(COMPANIES_TABLE)
            .update({"status": "rejected"})
            .eq("id", body.company_id)
            .eq("org_id", body.org_id)
            .execute()
        )

        # Mark associated emails as rejected
        emails_table = os.environ.get("SUPABASE_EMAIL_TABLE_NAME", "emails")
        try:
            await (
                supabase.table(emails_table)
                .update({"status": "rejected"})
                .eq("company_id", body.company_id)
                .execute()
            )
        except Exception:
            pass

        # Only trigger company search workflow as before if pending count is below threshold
        search_job_id = await _trigger_search_if_below_threshold(
            user_id=effective_user_id,
            org_id=body.org_id,
        )

        return {
            "status": "success",
            "company_id": body.company_id,
            "previous_status": current_status,
            "current_status": "rejected",
            "search_job_id": search_job_id,
            "message": "Company rejected.",
        }
