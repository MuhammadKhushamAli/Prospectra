"""API routes for sending outreach emails and checking IMAP mailbox replies."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, HTTPException

from app.api.auth import authorize_org_member
from app.email.imap_checker import detect_replies_for_org
from app.email.models import (
    CheckRepliesApiRequest,
    CheckRepliesApiResponse,
    SendEmailApiRequest,
    SendEmailApiResponse,
)
from app.email.service import send_company_outreach_email

router = APIRouter()


@router.post("/send-email", response_model=SendEmailApiResponse)
async def send_email_endpoint(body: SendEmailApiRequest):
    """
    Send an outreach email to the selected contact(s) of a targeted company
    using the organization's verified SMTP configuration with aiosmtplib.
    """
    try:
        await authorize_org_member(body.token, body.org_id)
    except Exception as auth_err:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {str(auth_err)}")

    try:
        result = await send_company_outreach_email(
            org_id=body.org_id,
            email_id=body.email_id,
            company_id=body.company_id,
            recipient_emails=body.recipient_emails,
            custom_subject=body.custom_subject,
            custom_body=body.custom_body,
        )
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except RuntimeError as run_err:
        raise HTTPException(status_code=502, detail=str(run_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error sending email: {str(exc)}")


@router.post("/check-replies", response_model=CheckRepliesApiResponse)
async def check_replies_endpoint(body: CheckRepliesApiRequest):
    """
    Trigger IMAP reply detection for the organization's mailbox using imap-tools.
    Detects replies, updates database records, and fires webhooks for app notification.
    """
    try:
        await authorize_org_member(body.token, body.org_id)
    except Exception as auth_err:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {str(auth_err)}")

    try:
        detected = await detect_replies_for_org(body.org_id)
        details = [
            {
                "email_id": r.email_id,
                "company_id": r.company_id,
                "company_name": r.company_name,
                "sender": r.sender,
                "subject": r.subject,
                "snippet": r.snippet,
                "date": r.date.isoformat() if hasattr(r.date, "isoformat") else str(r.date),
            }
            for r in detected
        ]
        return CheckRepliesApiResponse(
            status="success",
            replies_detected=len(detected),
            details=details,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error checking replies: {str(exc)}")
