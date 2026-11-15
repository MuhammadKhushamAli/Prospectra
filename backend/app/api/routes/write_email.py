"""Route: write an email using the email-writer LangGraph workflow."""

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.auth import authorize_org_member
from app.api.routes.helpers.jobs_helpers import (
    broadcast_job_webhook,
    build_started_webhook_payload,
)
from app.api.routes.helpers.write_email_helpers import (
    format_write_email_response,
    validate_company_and_email_for_generation,
)
from app.core.arq_config import enqueue_arq_job
from app.utils.helpers.db_status_helpers import revert_company_status_to_pending

router = APIRouter()


class WriteEmailRequest(BaseModel):
    token: str
    org_id: str
    target_company_id: str
    user_id: Optional[str] = None
    feedback: Optional[str] = None
    recipient_emails: Optional[List[str]] = None
    org_domain: Optional[str] = None


class WriteEmailResponse(BaseModel):
    status: str
    email_id: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    review_score: Optional[float] = None
    errors: list[str] = []


@router.post("/write-email")
async def write_email(body: WriteEmailRequest):
    """Authenticate member, verify company can have email written, and enqueue email generation job."""
    try:
        authenticated_user_id = await authorize_org_member(body.token, body.org_id)
    except Exception as auth_err:
        if body.target_company_id:
            await revert_company_status_to_pending(body.target_company_id, body.org_id)
        raise HTTPException(status_code=401, detail=f"Unauthorized: {str(auth_err)}") from auth_err

    effective_user_id = body.user_id or authenticated_user_id

    await validate_company_and_email_for_generation(
        target_company_id=body.target_company_id,
        org_id=body.org_id,
    )

    job_id = await enqueue_arq_job(
        "write_email_arq_task",
        effective_user_id,
        body.org_id,
        body.target_company_id,
        body.recipient_emails,
        body.org_domain,
        body.feedback,
    )
    if job_id is None:
        if body.target_company_id:
            await revert_company_status_to_pending(body.target_company_id, body.org_id)
        raise HTTPException(status_code=503, detail="Failed to enqueue email generation job in Redis")

    started_msg = (
        "Regenerating outreach email draft with your feedback..."
        if body.feedback
        else "Outreach email generation started..."
    )
    await broadcast_job_webhook(
        build_started_webhook_payload(
            job_id=job_id,
            task_name="write_email_arq_task",
            org_id=body.org_id,
            company_id=body.target_company_id,
            message=started_msg,
        )
    )

    return {
        "status": "queued",
        "job_id": job_id,
        "message": started_msg,
    }


__all__ = [
    "WriteEmailRequest",
    "WriteEmailResponse",
    "format_write_email_response",
    "revert_company_status_to_pending",
    "router",
    "write_email",
]
