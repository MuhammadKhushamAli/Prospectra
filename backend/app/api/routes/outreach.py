"""API routes for queuing outreach email dispatch and IMAP mailbox reply checks on the ARQ worker."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.auth import authorize_org_member
from app.api.routes.helpers.jobs_helpers import (
    broadcast_job_webhook,
    build_started_webhook_payload,
)
from app.core.arq_config import enqueue_arq_job
from app.email.models import (
    CheckRepliesApiRequest,
    CheckRepliesApiResponse,
    SendEmailApiRequest,
    SendEmailApiResponse,
)
from app.utils.constants.db_tables import EMAILS_TABLE
from app.utils.helpers.db_status_helpers import set_email_status_safe

router = APIRouter()
_set_email_status_safe = set_email_status_safe


@router.post("/send-email", response_model=SendEmailApiResponse)
async def send_email_endpoint(body: SendEmailApiRequest):
    """Authenticate member, mark email status as 'approved', and enqueue SMTP dispatch job."""
    try:
        await authorize_org_member(body.token, body.org_id)
    except Exception as auth_err:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {str(auth_err)}") from auth_err

    await set_email_status_safe(body.email_id, "approved")

    job_id = await enqueue_arq_job(
        "send_email_arq_task",
        body.org_id,
        body.email_id,
        body.company_id,
        body.recipient_emails,
        body.custom_subject,
        body.custom_body,
    )
    if job_id is None:
        await set_email_status_safe(body.email_id, "draft")
        raise HTTPException(status_code=503, detail="Failed to enqueue email send job in Redis")

    started_msg = "Sending outreach email..."
    await broadcast_job_webhook(
        build_started_webhook_payload(
            job_id=job_id,
            task_name="send_email_arq_task",
            org_id=body.org_id,
            company_id=body.company_id,
            email_id=body.email_id,
            message=started_msg,
        )
    )

    return SendEmailApiResponse(
        status="queued",
        email_id=body.email_id,
        job_id=job_id,
        message=started_msg,
        recipients_sent=body.recipient_emails or [],
    )


@router.post("/check-replies", response_model=CheckRepliesApiResponse)
async def check_replies_endpoint(body: CheckRepliesApiRequest):
    """Authenticate member and enqueue an IMAP reply detection job on the ARQ worker."""
    try:
        await authorize_org_member(body.token, body.org_id)
    except Exception as auth_err:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {str(auth_err)}") from auth_err

    job_id = await enqueue_arq_job(
        "check_email_replies_arq_task",
        body.org_id,
    )
    if job_id is None:
        raise HTTPException(status_code=503, detail="Failed to enqueue IMAP reply check job in Redis")

    await broadcast_job_webhook(
        build_started_webhook_payload(
            job_id=job_id,
            task_name="check_email_replies_arq_task",
            org_id=body.org_id,
            message="Checking mailbox for new replies...",
        )
    )

    return CheckRepliesApiResponse(
        status="queued",
        job_id=job_id,
        replies_detected=0,
        details=[],
    )


__all__ = [
    "EMAILS_TABLE",
    "_set_email_status_safe",
    "check_replies_endpoint",
    "router",
    "send_email_endpoint",
]
