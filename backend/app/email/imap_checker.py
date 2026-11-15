"""IMAP reply detection service using imap-tools for automated response tracking."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import re
import time
from typing import Any, List, Optional

from imap_tools import AND, MailBox, MailMessage

from app.api.routes.jobs import broadcast_job_webhook
from app.core.logging_config import get_node_logger
from app.email.credentials import fetch_org_email_credentials
from app.email.models import DetectedReply, EmailCredentials
from app.services.supabase import get_supabase_client

logger = get_node_logger("imap_checker")

EMAILS_TABLE = "emails"
COMPANIES_TABLE = "companies"


def clean_header_id(raw_id: str | None) -> str:
    """Normalize Message-ID, In-Reply-To, or References headers by stripping brackets and whitespace."""
    if not raw_id:
        return ""
    return raw_id.strip().strip("<>").strip().lower()


def extract_header_ids(raw_header: str | list | None) -> set[str]:
    """Extract all Message-IDs from a header string (which may contain multiple space-separated IDs)."""
    if not raw_header:
        return set()
    if isinstance(raw_header, list):
        items = raw_header
    else:
        items = re.findall(r"<[^>]+>|[\w.-]+@[\w.-]+", str(raw_header))
    return {clean_header_id(item) for item in items if clean_header_id(item)}


def normalize_subject(subj: str | None) -> str:
    """Normalize email subjects by repeatedly removing 'Re:', 'Fwd:', and trimming whitespace."""
    if not subj:
        return ""
    clean = re.sub(r"^(?:(?:re|fwd|fw):\s*)+", "", subj.strip(), flags=re.IGNORECASE)
    return clean.strip().lower()


def is_message_reply_to_email(
    msg: MailMessage,
    sent_email: dict[str, Any],
) -> bool:
    """
    Check if an incoming IMAP message is a reply to a sent email record.
    Matches via:
      1. RFC In-Reply-To / References headers matching the sent email's message_id.
      2. Sender email matching the recipient email address AND subject matching.
    """
    sent_msg_id = clean_header_id(sent_email.get("message_id"))
    recipient_email = (sent_email.get("recipient_email") or "").strip().lower()
    known_recipients = set(sent_email.get("recipient_emails") or [])
    if recipient_email:
        known_recipients.add(recipient_email)

    # 1. Thread Header Matching (RFC 2822 In-Reply-To / References)
    if sent_msg_id:
        in_reply_to = msg.headers.get("in-reply-to")
        references = msg.headers.get("references")

        incoming_ids = extract_header_ids(in_reply_to) | extract_header_ids(references)
        if sent_msg_id in incoming_ids:
            return True

    # 2. Sender and Subject Fallback Matching
    incoming_sender = (msg.from_ or "").strip().lower()
    if any(incoming_sender == r.lower() for r in known_recipients if r):
        sent_subject = normalize_subject(sent_email.get("subject"))
        incoming_subject = normalize_subject(msg.subject)
        if sent_subject and incoming_subject:
            if sent_subject in incoming_subject or incoming_subject in sent_subject:
                return True

    return False


def fetch_mailbox_messages(
    credentials: EmailCredentials,
    limit: int = 50,
) -> list[MailMessage]:
    """
    Synchronously connect to IMAP server using imap-tools and fetch recent messages.
    Executed in a thread executor to avoid blocking the asyncio event loop.
    """
    messages: list[MailMessage] = []
    try:
        logger.info(
            f"[IMAP CONNECT] Connecting to {credentials.imap_server}:{credentials.imap_port} "
            f"as '{credentials.smtp_username}'..."
        )
        with MailBox(credentials.imap_server, port=credentials.imap_port).login(
            credentials.smtp_username,
            credentials.smtp_password,
            initial_folder="INBOX",
        ) as mailbox:
            # Fetch the most recent messages from the inbox
            for msg in mailbox.fetch(reverse=True, limit=limit):
                messages.append(msg)
        logger.info(f"  [IMAP FETCH] Successfully inspected {len(messages)} recent messages.")
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


async def record_reply_in_database(
    email_id: str,
    company_id: str,
    incoming_msg: MailMessage,
) -> bool:
    """
    Update the email and company records in Supabase to mark them as 'replied',
    storing the reply preview snippet, sender, and subject.
    """
    supabase = await get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    raw_snippet = incoming_msg.text or incoming_msg.html or ""
    snippet = raw_snippet.strip()[:600]

    update_payload = {
        "status": "replied",
        "replied_at": now_iso,
        "reply_snippet": snippet,
        "reply_from": incoming_msg.from_ or "",
        "reply_subject": incoming_msg.subject or "",
    }

    try:
        # 1. Update emails table
        try:
            await supabase.table(EMAILS_TABLE).update(update_payload).eq("id", email_id).execute()
        except Exception:
            # Fallback if reply_* columns haven't been migrated yet
            await supabase.table(EMAILS_TABLE).update({"status": "replied"}).eq("id", email_id).execute()

        # 2. Update companies table to 'replied'
        if company_id:
            await supabase.table(COMPANIES_TABLE).update({"status": "replied"}).eq("id", company_id).execute()

        logger.info(f"  [REPLY RECORDED] Email {email_id} (Company: {company_id}) updated to 'replied'.")
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
) -> None:
    """
    Broadcast a webhook event to connected frontend clients so the mobile app
    triggers a native mobile notification immediately.
    """
    payload = {
        "job_id": f"reply-{email_id}",
        "task_name": "email_reply_detected",
        "org_id": org_id,
        "status": "done",
        "company_id": company_id,
        "message": f"New reply from {sender_email} ({company_name}): '{subject}'",
        "timestamp": time.time(),
    }
    await broadcast_job_webhook(payload)
    logger.info(f"  [WEBHOOK FIRED] Dispatched reply notification for {sender_email} ({company_name}).")


async def detect_replies_for_org(org_id: str) -> list[DetectedReply]:
    """
    Check the mailbox for an organization, correlate incoming messages with sent outreach,
    update the database, and fire webhooks for newly detected replies.
    """
    logger.banner(f"[IMAP REPLY CHECK] Running reply detection for org: {org_id}")

    try:
        credentials = await fetch_org_email_credentials(org_id)
    except Exception as cred_err:
        logger.warning(f"Cannot run reply detection for org {org_id}: {cred_err}")
        return []

    sent_emails = await get_sent_emails_for_org(org_id)
    if not sent_emails:
        logger.info(f"[IMAP REPLY CHECK] No emails in 'sent' status awaiting replies for org {org_id}.")
        return []

    logger.info(f"[IMAP REPLY CHECK] Inspecting mailbox for replies to {len(sent_emails)} sent emails...")

    # Fetch messages in a thread pool to avoid blocking async event loop
    loop = asyncio.get_running_loop()
    messages = await loop.run_in_executor(
        None,
        fetch_mailbox_messages,
        credentials,
        60,
    )

    detected: list[DetectedReply] = []

    for sent in sent_emails:
        for msg in messages:
            if is_message_reply_to_email(msg, sent):
                email_id = sent["id"]
                company_id = sent.get("company_id") or ""
                company_info = sent.get("companies") or {}
                company_name = company_info.get("name") or "Target Company"

                logger.info(
                    f"  [MATCH FOUND] Reply detected from '{msg.from_}' for company '{company_name}' "
                    f"(Subject: '{msg.subject}')"
                )

                # Persist in DB
                recorded = await record_reply_in_database(
                    email_id=email_id,
                    company_id=company_id,
                    incoming_msg=msg,
                )

                if recorded:
                    # Fire webhook to trigger mobile notification in the app
                    await broadcast_reply_notification(
                        org_id=org_id,
                        company_id=company_id,
                        email_id=email_id,
                        company_name=company_name,
                        sender_email=msg.from_ or "Prospect",
                        subject=msg.subject or sent.get("subject") or "Outreach",
                    )

                    reply_item = DetectedReply(
                        email_id=email_id,
                        org_id=org_id,
                        company_id=company_id,
                        company_name=company_name,
                        sender=msg.from_ or "",
                        subject=msg.subject or "",
                        snippet=(msg.text or msg.html or "")[:300],
                        date=msg.date or datetime.now(timezone.utc),
                        message_id=msg.headers.get("message-id", [None])[0] if isinstance(msg.headers.get("message-id"), list) else msg.headers.get("message-id"),
                    )
                    detected.append(reply_item)
                break  # Matched this sent email, continue to next

    logger.info(f"[IMAP REPLY CHECK] Finished. Total replies detected: {len(detected)}.")
    return detected
