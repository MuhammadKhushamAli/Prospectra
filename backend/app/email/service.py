"""High-level orchestration service for sending company outreach emails."""

from __future__ import annotations

from typing import List, Optional

from app.core.logging_config import get_node_logger
from app.email.credentials import fetch_org_email_credentials
from app.email.helpers.outreach_db_helpers import (
    fetch_email_with_company,
    format_send_email_summary,
    lookup_company_recipient_emails,
    mark_email_and_company_sent,
)
from app.email.models import SendEmailApiResponse
from app.email.smtp_sender import dispatch_outreach_emails
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import COMPANIES_TABLE, CONTACTS_TABLE, EMAILS_TABLE
from app.utils.constants.email_constants import DEFAULT_EMAIL_SUBJECT

logger = get_node_logger("email_service")


async def send_company_outreach_email(
    *,
    org_id: str,
    email_id: str,
    company_id: Optional[str] = None,
    recipient_emails: Optional[List[str]] = None,
    custom_subject: Optional[str] = None,
    custom_body: Optional[str] = None,
) -> SendEmailApiResponse:
    """Send an outreach email to the selected recipient(s) of a targeted company via verified SMTP."""
    supabase = await get_supabase_client()
    email_row = await fetch_email_with_company(supabase, email_id, EMAILS_TABLE)

    target_comp_id = company_id or email_row.get("company_id")
    company_data = email_row.get("companies") or {}
    if company_data.get("status") == "rejected":
        raise ValueError("Cannot send outreach email: target company is rejected.")

    if email_row.get("status") == "sent":
        raise ValueError("This outreach email has already been sent.")

    credentials = await fetch_org_email_credentials(org_id)

    effective_recipients: list[str] = []
    if recipient_emails and len(recipient_emails) > 0:
        effective_recipients = [r.strip() for r in recipient_emails if r and r.strip()]

    if not effective_recipients:
        effective_recipients = await lookup_company_recipient_emails(
            supabase=supabase,
            company_id=target_comp_id,
            contact_id=email_row.get("contact_id"),
            contacts_table=CONTACTS_TABLE,
        )

    if not effective_recipients:
        raise ValueError(
            "No recipient email addresses found for this company. "
            "Please select or add at least one recipient email address."
        )

    subject = (custom_subject or email_row.get("subject") or DEFAULT_EMAIL_SUBJECT).strip()
    body = (custom_body or email_row.get("body") or "").strip()
    if not body:
        raise ValueError("Email body is empty. Please draft or regenerate the email before sending.")

    successful, message_ids, failed = await dispatch_outreach_emails(
        credentials=credentials,
        recipients=effective_recipients,
        subject=subject,
        body=body,
        reply_to=credentials.sender_email,
    )

    if not successful:
        first_err = failed[0]["error"] if failed else "Failed to send email."
        raise RuntimeError(f"SMTP dispatch failed: {first_err}")

    await mark_email_and_company_sent(
        supabase=supabase,
        email_id=email_id,
        target_comp_id=target_comp_id,
        successful_recipients=successful,
        message_ids=message_ids,
        custom_subject=custom_subject,
        custom_body=custom_body,
        emails_table=EMAILS_TABLE,
        companies_table=COMPANIES_TABLE,
    )

    logger.info(
        f"[OUTREACH SEND] Dispatched email {email_id} (org={org_id}): "
        f"{len(successful)}/{len(effective_recipients)} sent ({len(failed)} failed)."
    )

    status_str, message_str = format_send_email_summary(successful, failed)

    return SendEmailApiResponse(
        status=status_str,
        email_id=email_id,
        message=message_str,
        recipients_sent=successful,
        recipients_failed=failed,
        message_ids=message_ids,
    )


__all__ = [
    "COMPANIES_TABLE",
    "CONTACTS_TABLE",
    "EMAILS_TABLE",
    "lookup_company_recipient_emails",
    "send_company_outreach_email",
]
