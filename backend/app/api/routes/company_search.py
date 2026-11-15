"""Routes for company discovery search and company status approval/rejection."""

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.auth import authorize_org_member
from app.api.routes.helpers.company_search_helpers import (
    _count_pending,
    _get_threshold,
    _search_until_threshold,
    _trigger_search_if_below_threshold,
    fetch_company_for_org,
    handle_accept_company_status,
    handle_reject_company_status,
)
from app.api.routes.helpers.jobs_helpers import (
    broadcast_job_webhook,
    build_started_webhook_payload,
)
from app.core.arq_config import enqueue_arq_job
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import COMPANIES_TABLE, ORGANIZATIONS_TABLE
from app.utils.constants.prospecting_constants import (
    MAX_STALLED_RUNS,
    PENDING_STATUS,
    PENDING_STATUSES,
)

router = APIRouter()


class SearchCompanyRequest(BaseModel):
    token: str
    org_id: str


class UpdateCompanyStatusRequest(BaseModel):
    token: str
    org_id: str
    company_id: str
    status: str
    user_id: Optional[str] = None
    recipient_emails: Optional[List[str]] = None
    org_domain: Optional[str] = None
    feedback: Optional[str] = None


@router.post("/search-company")
async def search_company(body: SearchCompanyRequest):
    """Authenticate member, enqueue autonomous company finder job to ARQ, and send 'started' webhook."""
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

    started_msg = "Company search started. Discovering target companies..."
    await broadcast_job_webhook(
        build_started_webhook_payload(
            job_id=job_id,
            task_name="search_companies_arq_task",
            org_id=body.org_id,
            message=started_msg,
        )
    )

    return {
        "status": "queued",
        "message": started_msg,
        "job_id": job_id,
        "pending": pending,
        "threshold": threshold,
    }


@router.post("/company-status")
async def update_company_status(body: UpdateCompanyStatusRequest):
    """Update company status with strict backend workflow enforcement ('approved' or 'rejected')."""
    authenticated_user_id = await authorize_org_member(body.token, body.org_id)
    effective_user_id = body.user_id or authenticated_user_id

    requested_status = str(body.status).strip().lower()
    if requested_status not in ("approved", "rejected"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid review status: '{body.status}'. Only 'approved' or 'rejected' are allowed.",
        )

    supabase = await get_supabase_client()
    company = await fetch_company_for_org(supabase, body.company_id, body.org_id)
    current_status = str(company.get("status") or "").strip().lower()

    if current_status not in PENDING_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"status already assigned: company '{company.get('name', body.company_id)}' is currently '{current_status}'.",
        )

    if requested_status == "approved":
        return await handle_accept_company_status(
            supabase=supabase,
            company_id=body.company_id,
            org_id=body.org_id,
            effective_user_id=effective_user_id,
            current_status=current_status,
            feedback=body.feedback,
            recipient_emails=body.recipient_emails,
            org_domain=body.org_domain,
        )

    return await handle_reject_company_status(
        supabase=supabase,
        company_id=body.company_id,
        org_id=body.org_id,
        effective_user_id=effective_user_id,
        current_status=current_status,
    )


__all__ = [
    "COMPANIES_TABLE",
    "MAX_STALLED_RUNS",
    "ORGANIZATIONS_TABLE",
    "PENDING_STATUS",
    "PENDING_STATUSES",
    "SearchCompanyRequest",
    "UpdateCompanyStatusRequest",
    "_count_pending",
    "_get_threshold",
    "_search_until_threshold",
    "_trigger_search_if_below_threshold",
    "router",
    "search_company",
    "update_company_status",
]
