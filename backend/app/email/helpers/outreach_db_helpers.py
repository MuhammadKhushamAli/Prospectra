"""Database lookup and update helpers for outreach email dispatch."""

from __future__ import annotations

from typing import Any

from app.core.logging_config import get_node_logger
from app.utils.constants.db_tables import COMPANIES_TABLE, CONTACTS_TABLE, EMAILS_TABLE
from app.utils.helpers.time_helpers import utc_now_iso

logger = get_node_logger("email_service")


async def lookup_company_recipient_emails(
    supabase: Any,
    company_id: str,
    contact_id: str | None = None,
    contacts_table: str = CONTACTS_TABLE,
) -> list[str]:
    """Look up verified recipient contact emails for a target company."""
    recipients: list[str] = []

    if contact_id:
        try:
            c_res = await (
                supabase.table(contacts_table)
                .select("email")
                .eq("id", contact_id)
                .limit(1)
                .execute()
            )
            if c_res.data and c_res.data[0].get("email"):
                recipients.append(c_res.data[0]["email"].strip())
        except Exception:
            pass

    if not recipients:
        try:
            contacts_res = await (
                supabase.table(contacts_table)
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


async def fetch_email_with_company(
    supabase: Any,
    email_id: str,
    emails_table: str = EMAILS_TABLE,
) -> dict[str, Any]:
    """Fetch an email row joined with its target company from Supabase."""
    email_res = await (
        supabase.table(emails_table)
        .select("*, companies(*)")
        .eq("id", email_id)
        .limit(1)
        .execute()
    )
    if not email_res.data:
        raise ValueError(f"Outreach email record '{email_id}' not found.")
    return dict(email_res.data[0])


async def mark_email_and_company_sent(
    supabase: Any,
    email_id: str,
    target_comp_id: str | None,
    successful_recipients: list[str],
    message_ids: list[str],
    custom_subject: str | None = None,
    custom_body: str | None = None,
    sender_email: str | None = None,
    emails_table: str = EMAILS_TABLE,
    companies_table: str = COMPANIES_TABLE,
) -> None:
    """Update the email and company rows in Supabase to 'sent' after successful SMTP dispatch."""
    now_iso = utc_now_iso()
    primary_recipient = successful_recipients[0]
    primary_msg_id = message_ids[0] if message_ids else None

    update_payload: dict[str, Any] = {
        "status": "sent",
        "sent_at": now_iso,
        "recipient_email": primary_recipient,
        "recipient_emails": successful_recipients,
        "message_id": primary_msg_id,
    }
    if sender_email:
        update_payload["sender_email"] = sender_email
    if custom_subject:
        update_payload["subject"] = custom_subject
    if custom_body:
        update_payload["body"] = custom_body

    try:
        await supabase.table(emails_table).update(update_payload).eq("id", email_id).execute()
    except Exception:
        await (
            supabase.table(emails_table)
            .update({"status": "sent", "sent_at": now_iso})
            .eq("id", email_id)
            .execute()
        )

    if target_comp_id:
        try:
            await supabase.table(companies_table).update({"status": "sent"}).eq("id", target_comp_id).execute()
        except Exception as comp_err:
            logger.warning(f"Could not update company {target_comp_id} status to 'sent': {comp_err}")


def format_send_email_summary(
    successful: list[str],
    failed: list[dict[str, str]],
) -> tuple[str, str]:
    """Build status ('success' | 'partial') and user-facing message for sent outreach."""
    status_str = "success" if not failed else "partial"
    message_str = f"Email successfully sent to {', '.join(successful)}."
    if failed:
        failed_names = ", ".join(f["email"] for f in failed)
        message_str += f" Failed for: {failed_names}."
    return status_str, message_str
