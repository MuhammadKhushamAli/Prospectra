"""IMAP mailbox connection, database reply persistence, and webhook notification helpers."""

from __future__ import annotations

from typing import Any

from imap_tools import MailBox, MailMessage

from app.api.routes.jobs import broadcast_job_webhook
from app.core.arq_config import trigger_job_webhook
from app.core.logging_config import get_node_logger
from app.email.models import EmailCredentials, ReplySummaryItem
from app.models.job_models import JobWebhookPayload
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import COMPANIES_TABLE, EMAILS_TABLE
from app.utils.helpers.time_helpers import unix_now, utc_now_iso

logger = get_node_logger("imap_checker")


def fetch_mailbox_messages(
    credentials: EmailCredentials,
    limit: int = 50,
) -> list[MailMessage]:
    """Synchronously connect to IMAP server using imap-tools and fetch recent messages."""
    messages: list[MailMessage] = []
    try:
        with MailBox(credentials.imap_server, port=credentials.imap_port).login(
            credentials.smtp_username,
            credentials.smtp_password,
            initial_folder="INBOX",
        ) as mailbox:
            for msg in mailbox.fetch(reverse=True, limit=limit):
                messages.append(msg)
    except Exception as exc:
        logger.error(f"[IMAP CONNECTION ERROR] Failed to connect/fetch from {credentials.imap_server}: {exc}")

    return messages


async def get_sent_emails_for_org(org_id: str) -> list[dict[str, Any]]:
    """Fetch all emails with status='sent' for an organization that are awaiting replies."""
    supabase = await get_supabase_client()
    try:
        res = await (
            supabase.table(EMAILS_TABLE)
            .select("id, company_id, subject, recipient_email, recipient_emails, message_id, status, companies(name, domain)")
            .eq("sent_by_org_id", org_id)
            .eq("status", "sent")
            .execute()
        )
        return res.data or []
    except Exception as err:
        logger.warning(f"Could not fetch sent emails for org {org_id}: {err}")
        return []


async def fetch_active_org_ids_with_sent_emails() -> list[str]:
    """Return sorted unique organization IDs that currently have emails in 'sent' status."""
    supabase = await get_supabase_client()
    try:
        res = await (
            supabase.table(EMAILS_TABLE)
            .select("sent_by_org_id")
            .eq("status", "sent")
            .execute()
        )
        rows = res.data or []
        return sorted({str(r["sent_by_org_id"]) for r in rows if r.get("sent_by_org_id")})
    except Exception as exc:
        logger.warning(f"[IMAP REPLY CHECK] Could not query active orgs with sent emails: {exc}")
        return []


async def record_reply_in_database(
    email_id: str,
    company_id: str,
    incoming_msg: MailMessage,
    replies_list: list[dict[str, Any]] | None = None,
) -> bool:
    """Update the email and company records in Supabase to mark them as 'replied'."""
    supabase = await get_supabase_client()
    now_iso = utc_now_iso()
    raw_snippet = incoming_msg.text or incoming_msg.html or ""
    snippet = raw_snippet.strip()[:600]
    effective_replies = replies_list or [
        ReplySummaryItem(
            id=f"reply-{email_id}-0",
            sender=incoming_msg.from_ or "",
            subject=incoming_msg.subject or "",
            snippet=snippet,
            date=now_iso,
        ).to_dict()
    ]

    full_payload = {
        "status": "replied",
        "replied_at": now_iso,
        "reply_snippet": snippet,
        "reply_from": incoming_msg.from_ or "",
        "reply_subject": incoming_msg.subject or "",
        "reply_count": len(effective_replies),
        "replies": effective_replies,
    }
    base_reply_payload = {
        "status": "replied",
        "replied_at": now_iso,
        "reply_snippet": snippet,
        "reply_from": incoming_msg.from_ or "",
        "reply_subject": incoming_msg.subject or "",
    }

    try:
        try:
            await supabase.table(EMAILS_TABLE).update(full_payload).eq("id", email_id).execute()
        except Exception:
            try:
                await supabase.table(EMAILS_TABLE).update(base_reply_payload).eq("id", email_id).execute()
            except Exception:
                await supabase.table(EMAILS_TABLE).update({"status": "replied"}).eq("id", email_id).execute()

        if company_id:
            await supabase.table(COMPANIES_TABLE).update({"status": "replied"}).eq("id", company_id).execute()

        return True
    except Exception as exc:
        logger.error(f"Failed to record reply in DB for email {email_id}: {exc}")
        return False


async def broadcast_reply_notification(
    org_id: str,
    company_id: str,
    email_id: str,
    company_name: str,
    sender_email: str,
    subject: str,
    snippet: str = "",
    replied_at: str | None = None,
    reply_count: int = 1,
    replies: list[dict[str, Any]] | None = None,
) -> None:
    """Broadcast a webhook event to connected frontend clients when a reply is detected."""
    now_iso = replied_at or utc_now_iso()
    message = f"New reply from {sender_email} ({company_name}): '{subject}'"
    payload = JobWebhookPayload(
        job_id=f"reply-{email_id}",
        task_name="email_reply_detected",
        org_id=org_id,
        status="done",
        company_id=company_id,
        email_id=email_id,
        reply_count=reply_count,
        reply_from=sender_email,
        reply_subject=subject,
        reply_snippet=snippet,
        replied_at=now_iso,
        replies=replies or [],
        message=message,
        timestamp=unix_now(),
    ).to_dict()
    await broadcast_job_webhook(payload)
    await trigger_job_webhook(
        job_id=f"reply-{email_id}",
        task_name="email_reply_detected",
        org_id=org_id,
        company_id=company_id,
        email_id=email_id,
        reply_count=reply_count,
        reply_from=sender_email,
        reply_subject=subject,
        reply_snippet=snippet,
        replied_at=now_iso,
        replies=replies or [],
        status="done",
        message=message,
    )
