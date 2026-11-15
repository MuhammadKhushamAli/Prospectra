"""High-level orchestration service for sending company outreach emails."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, List, Optional

from app.core.logging_config import get_node_logger
from app.email.credentials import fetch_org_email_credentials
from app.email.models import SendEmailApiResponse
from app.email.smtp_sender import dispatch_outreach_emails
from app.services.supabase import get_supabase_client

logger = get_node_logger("email_service")

EMAILS_TABLE = "emails"
COMPANIES_TABLE = "companies"
CONTACTS_TABLE = "contacts"


async def lookup_company_recipient_emails(
    supabase: Any,
    company_id: str,
    contact_id: str | None = None,
) -> list[str]:
    """
    Look up verified recipient contact emails for a target company when
    no explicit recipients were chosen by the user in the client.
    """
    recipients: list[str] = []

    # 1. If contact_id is set on the email, look up that specific contact
    if contact_id:
        try:
            c_res = await (
                supabase.table(CONTACTS_TABLE)
                .select("email")
                .eq("id", contact_id)
                .limit(1)
                .execute()
            )
            if c_res.data and c_res.data[0].get("email"):
                recipients.append(c_res.data[0]["email"].strip())
        except Exception:
            pass

    # 2. Look up all contacts for the company
    if not recipients:
        try:
            contacts_res = await (
                supabase.table(CONTACTS_TABLE)
                .select("email")
                .eq("company_id", company_id)
                .execute()
            )
            for row in contacts_res.data or []:
                email_val = (row.get("email") or "").strip()
                if email_val and email_val not in recipients:
                    recipients.append(email_val)
        except Exception:
            pass

    
    return recipients


async def send_company_outreach_email(
    *,
    org_id: str,
    email_id: str,
    company_id: Optional[str] = None,
    recipient_emails: Optional[List[str]] = None,
    custom_subject: Optional[str] = None,
    custom_body: Optional[str] = None,
) -> SendEmailApiResponse:
    """
    Send an outreach email to the selected recipient(s) of a targeted company
    using the organization's verified SMTP configuration.
    """
    logger.banner(f"[OUTREACH SEND] Initiating dispatch for email ID: {email_id} (Org: {org_id})")

    supabase = await get_supabase_client()

    # 1. Fetch email record
    email_res = await (
        supabase.table(EMAILS_TABLE)
        .select("*, companies(*)")
        .eq("id", email_id)
        .limit(1)
        .execute()
    )

    if not email_res.data:
        raise ValueError(f"Outreach email record '{email_id}' not found.")

    email_row = email_res.data[0]
    target_comp_id = company_id or email_row.get("company_id")
    company_data = email_row.get("companies") or {}
    company_status = company_data.get("status")

    # Guard: rejected companies cannot be contacted
    if company_status == "rejected":
        raise ValueError("Cannot send outreach email: target company is rejected.")

    # Guard: already sent
    if email_row.get("status") == "sent":
        raise ValueError("This outreach email has already been sent.")

    # 2. Fetch verified credentials
    credentials = await fetch_org_email_credentials(org_id)

    # 3. Resolve recipients
    effective_recipients: list[str] = []
    if recipient_emails and len(recipient_emails) > 0:
        effective_recipients = [r.strip() for r in recipient_emails if r and r.strip()]

    if not effective_recipients:
        effective_recipients = await lookup_company_recipient_emails(
            supabase=supabase,
            company_id=target_comp_id,
            contact_id=email_row.get("contact_id"),
        )

    if not effective_recipients:
        raise ValueError(
            "No recipient email addresses found for this company. "
            "Please select or add at least one recipient email address."
        )

    # 4. Resolve content
    subject = (custom_subject or email_row.get("subject") or "Outreach Inquiry").strip()
    body = (custom_body or email_row.get("body") or "").strip()
    if not body:
        raise ValueError("Email body is empty. Please draft or regenerate the email before sending.")

    # 5. Dispatch via aiosmtplib
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

    # 6. Update database records upon successful dispatch
    now_iso = datetime.now(timezone.utc).isoformat()
    primary_recipient = successful[0]
    primary_msg_id = message_ids[0] if message_ids else None

    update_payload: dict[str, Any] = {
        "status": "sent",
        "sent_at": now_iso,
        "recipient_email": primary_recipient,
        "recipient_emails": successful,
        "message_id": primary_msg_id,
    }
    if custom_subject:
        update_payload["subject"] = custom_subject
    if custom_body:
        update_payload["body"] = custom_body

    try:
        await supabase.table(EMAILS_TABLE).update(update_payload).eq("id", email_id).execute()
    except Exception:
        # Fallback if new columns have not been migrated yet
        await (
            supabase.table(EMAILS_TABLE)
            .update({"status": "sent", "sent_at": now_iso})
            .eq("id", email_id)
            .execute()
        )

    # Update company status to 'sent'
    if target_comp_id:
        try:
            await supabase.table(COMPANIES_TABLE).update({"status": "sent"}).eq("id", target_comp_id).execute()
        except Exception as comp_err:
            logger.warning(f"Could not update company {target_comp_id} status to 'sent': {comp_err}")

    logger.info(
        f"[OUTREACH SENT] Email {email_id} successfully sent to {len(successful)} recipient(s): "
        f"{', '.join(successful)}"
    )

    status_str = "success" if not failed else "partial"
    message_str = f"Email successfully sent to {', '.join(successful)}."
    if failed:
        failed_names = ", ".join(f["email"] for f in failed)
        message_str += f" Failed for: {failed_names}."

    return SendEmailApiResponse(
        status=status_str,
        email_id=email_id,
        message=message_str,
        recipients_sent=successful,
        recipients_failed=failed,
        message_ids=message_ids,
    )
