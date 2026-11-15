"""API routes for queuing outreach email dispatch and IMAP mailbox reply checks on the ARQ worker."""

from __future__ import annotations

import time
from fastapi import APIRouter, HTTPException

from app.api.auth import authorize_org_member
from app.api.routes.jobs import broadcast_job_webhook
from app.core.arq_config import enqueue_arq_job
from app.email.models import (
    CheckRepliesApiRequest,
    CheckRepliesApiResponse,
    SendEmailApiRequest,
    SendEmailApiResponse,
)
from app.services.supabase import get_supabase_client

router = APIRouter()
EMAILS_TABLE = "emails"


async def _set_email_status_safe(email_id: str, status: str) -> None:
    """Safely update an email's status in Supabase (e.g. 'approved' while sending, or revert to 'draft')."""
    try:
        supabase = await get_supabase_client()
        await supabase.table(EMAILS_TABLE).update({"status": status}).eq("id", email_id).execute()
    except Exception:
        pass


@router.post("/send-email", response_model=SendEmailApiResponse)
async def send_email_endpoint(body: SendEmailApiRequest):
    """
    Authenticate member, mark email status as 'approved' (Sending state in DB),
    and enqueue an outreach email dispatch job (send_email_arq_task) to the ARQ worker
    so SMTP sending via aiosmtplib is handled asynchronously by the worker.
    """
    try:
        await authorize_org_member(body.token, body.org_id)
    except Exception as auth_err:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {str(auth_err)}")

    # Mark email as 'approved' (represents in-flight 'Sending' section in the DB enum)
    await _set_email_status_safe(body.email_id, "approved")

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
        await _set_email_status_safe(body.email_id, "draft")
        raise HTTPException(status_code=503, detail="Failed to enqueue email send job in Redis")

    started_msg = "Sending outreach email..."
    await broadcast_job_webhook(
        {
            "job_id": job_id,
            "task_name": "send_email_arq_task",
            "org_id": body.org_id,
            "company_id": body.company_id,
            "email_id": body.email_id,
            "status": "started",
            "message": started_msg,
            "error": None,
            "timestamp": time.time(),
        }
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
    """
    Authenticate member and enqueue an IMAP reply detection job (check_email_replies_arq_task)
    to the ARQ worker so IMAP inspection via imap-tools is handled by the worker.
    """
    try:
        await authorize_org_member(body.token, body.org_id)
    except Exception as auth_err:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {str(auth_err)}")

    job_id = await enqueue_arq_job(
        "check_email_replies_arq_task",
        body.org_id,
    )
    if job_id is None:
        raise HTTPException(status_code=503, detail="Failed to enqueue IMAP reply check job in Redis")

    await broadcast_job_webhook(
        {
            "job_id": job_id,
            "task_name": "check_email_replies_arq_task",
            "org_id": body.org_id,
            "company_id": None,
            "status": "started",
            "message": "Checking mailbox for new replies...",
            "error": None,
            "timestamp": time.time(),
        }
    )

    return CheckRepliesApiResponse(
        status="queued",
        job_id=job_id,
        replies_detected=0,
        details=[],
    )
