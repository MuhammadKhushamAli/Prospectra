"""Helper functions for company search threshold checks, pending counts, and company status transitions."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from app.api.routes.helpers.jobs_helpers import (
    broadcast_job_webhook,
    build_started_webhook_payload,
)
from app.core.arq_config import enqueue_arq_job
from app.langgraph.company_finder.graph import run_prospect_workflow
from app.models.job_models import CompanyStatusTransitionResponse
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import COMPANIES_TABLE, EMAILS_TABLE, ORGANIZATIONS_TABLE
from app.utils.constants.prospecting_constants import (
    DEFAULT_PENDING_THRESHOLD,
    MAX_STALLED_RUNS,
    PENDING_STATUSES,
)
from app.utils.helpers.db_status_helpers import revert_company_status_to_pending


async def _get_threshold(org_id: str) -> int:
    """Fetch the pending companies threshold configured for an organization."""
    supabase = await get_supabase_client()
    response = await (
        supabase
        .table(ORGANIZATIONS_TABLE)
        .select("pending_threshold")
        .eq("id", org_id)
        .single()
        .execute()
    )
    return response.data.get("pending_threshold", DEFAULT_PENDING_THRESHOLD) if response.data else DEFAULT_PENDING_THRESHOLD


async def _count_pending(org_id: str) -> int:
    """Count the number of companies currently in a pending state for an organization."""
    supabase = await get_supabase_client()
    response = await (
        supabase
        .table(COMPANIES_TABLE)
        .select("id", count="exact")
        .eq("org_id", org_id)
        .in_("status", list(PENDING_STATUSES))
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


async def _trigger_search_if_below_threshold(user_id: str, org_id: str) -> Optional[str]:
    """Check pending count and trigger company search workflow only if no pending companies remain."""
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
                    build_started_webhook_payload(
                        job_id=job_id,
                        task_name="search_companies_arq_task",
                        org_id=org_id,
                        message="Company search started. Discovering target companies...",
                    )
                )
                return job_id
    except Exception as exc:
        print(f"Warning: Failed to trigger company search refill: {exc}")
    return None


async def fetch_company_for_org(
    supabase: Any,
    company_id: str,
    org_id: str,
) -> Dict[str, Any]:
    """Fetch a company row for an organization or raise 404 HTTPException."""
    res = await (
        supabase.table(COMPANIES_TABLE)
        .select("id, org_id, status, name")
        .eq("id", company_id)
        .eq("org_id", org_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Company not found in organization.")
    return dict(res.data[0])


async def handle_accept_company_status(
    supabase: Any,
    company_id: str,
    org_id: str,
    effective_user_id: str,
    current_status: str,
    feedback: Optional[str] = None,
    recipient_emails: Optional[List[str]] = None,
    org_domain: Optional[str] = None,
) -> Dict[str, Any]:
    """Approve a pending company, enqueue the email writer job, and trigger search refill if needed."""
    await (
        supabase.table(COMPANIES_TABLE)
        .update({"status": "approved"})
        .eq("id", company_id)
        .eq("org_id", org_id)
        .execute()
    )

    email_job_id = await enqueue_arq_job(
        "write_email_arq_task",
        effective_user_id,
        org_id,
        company_id,
        recipient_emails,
        org_domain,
        feedback,
    )

    if email_job_id is None:
        await revert_company_status_to_pending(company_id, org_id)
        raise HTTPException(
            status_code=503,
            detail="Failed to enqueue email generation job in Redis; reverted company status to pending.",
        )

    await broadcast_job_webhook(
        build_started_webhook_payload(
            job_id=email_job_id,
            task_name="write_email_arq_task",
            org_id=org_id,
            company_id=company_id,
            message="Outreach email generation started...",
        )
    )

    search_job_id = await _trigger_search_if_below_threshold(
        user_id=effective_user_id,
        org_id=org_id,
    )

    response = CompanyStatusTransitionResponse(
        status="success",
        company_id=company_id,
        previous_status=current_status,
        current_status="approved",
        email_job_id=email_job_id,
        search_job_id=search_job_id,
        message="Company accepted. Email generation agent triggered.",
    )
    return response.to_dict()


async def handle_reject_company_status(
    supabase: Any,
    company_id: str,
    org_id: str,
    effective_user_id: str,
    current_status: str,
) -> Dict[str, Any]:
    """Reject a pending company, mark its emails rejected, and trigger search refill if needed."""
    await (
        supabase.table(COMPANIES_TABLE)
        .update({"status": "rejected"})
        .eq("id", company_id)
        .eq("org_id", org_id)
        .execute()
    )

    try:
        await (
            supabase.table(EMAILS_TABLE)
            .update({"status": "rejected"})
            .eq("company_id", company_id)
            .execute()
        )
    except Exception:
        pass

    search_job_id = await _trigger_search_if_below_threshold(
        user_id=effective_user_id,
        org_id=org_id,
    )

    response = CompanyStatusTransitionResponse(
        status="success",
        company_id=company_id,
        previous_status=current_status,
        current_status="rejected",
        search_job_id=search_job_id,
        message="Company rejected.",
    )
    return response.to_dict(exclude_none=True) | {"search_job_id": search_job_id}
