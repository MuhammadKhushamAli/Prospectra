"""IMAP reply detection service using imap-tools for automated response tracking."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import re
import time
from typing import Any, List, Optional

from imap_tools import AND, MailBox, MailMessage

from app.api.routes.jobs import broadcast_job_webhook
from app.core.arq_config import trigger_job_webhook
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
    replies_list: list[dict[str, Any]] | None = None,
) -> bool:
    """
    Update the email and company records in Supabase to mark them as 'replied',
    storing the reply preview snippet, sender, subject, reply_count, and replies list.
    """
    supabase = await get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    raw_snippet = incoming_msg.text or incoming_msg.html or ""
    snippet = raw_snippet.strip()[:600]
    effective_replies = replies_list or [
        {
            "id": f"reply-{email_id}-0",
            "sender": incoming_msg.from_ or "",
            "subject": incoming_msg.subject or "",
            "snippet": snippet,
            "date": now_iso,
        }
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
        # 1. Update emails table
        try:
            await supabase.table(EMAILS_TABLE).update(full_payload).eq("id", email_id).execute()
        except Exception:
            try:
                await supabase.table(EMAILS_TABLE).update(base_reply_payload).eq("id", email_id).execute()
            except Exception:
                # Fallback if reply_* columns haven't been migrated yet
                await supabase.table(EMAILS_TABLE).update({"status": "replied"}).eq("id", email_id).execute()

        # 2. Update companies table to 'replied'
        if company_id:
            await supabase.table(COMPANIES_TABLE).update({"status": "replied"}).eq("id", company_id).execute()

        logger.info(
            f"  [REPLY RECORDED] Email {email_id} (Company: {company_id}) updated to 'replied' "
            f"(replies: {len(effective_replies)})."
        )
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
    """
    Broadcast a webhook event to connected frontend clients so the mobile app
    triggers a native mobile notification immediately and updates the reply counter.
    """
    now_iso = replied_at or datetime.now(timezone.utc).isoformat()
    message = f"New reply from {sender_email} ({company_name}): '{subject}'"
    payload = {
        "job_id": f"reply-{email_id}",
        "task_name": "email_reply_detected",
        "org_id": org_id,
        "status": "done",
        "company_id": company_id,
        "email_id": email_id,
        "reply_count": reply_count,
        "reply_from": sender_email,
        "reply_subject": subject,
        "reply_snippet": snippet,
        "replied_at": now_iso,
        "replies": replies or [],
        "message": message,
        "timestamp": time.time(),
    }
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
        matched_msgs = [msg for msg in messages if is_message_reply_to_email(msg, sent)]
        if not matched_msgs:
            continue

        email_id = sent["id"]
        company_id = sent.get("company_id") or ""
        company_info = sent.get("companies") or {}
        company_name = company_info.get("name") or "Target Company"
        latest_msg = matched_msgs[0]

        replies_list: list[dict[str, Any]] = []
        for idx, m in enumerate(matched_msgs):
            raw_msg_id = (
                m.headers.get("message-id", [None])[0]
                if isinstance(m.headers.get("message-id"), list)
                else m.headers.get("message-id")
            )
            msg_date = m.date or datetime.now(timezone.utc)
            date_iso = msg_date.isoformat() if hasattr(msg_date, "isoformat") else str(msg_date)
            replies_list.append(
                {
                    "id": str(raw_msg_id or f"reply-{email_id}-{idx}"),
                    "sender": m.from_ or "Prospect",
                    "subject": m.subject or sent.get("subject") or "Re: Outreach",
                    "snippet": (m.text or m.html or "").strip()[:1000],
                    "date": date_iso,
                }
            )

        logger.info(
            f"  [MATCH FOUND] {len(replies_list)} reply(s) detected from '{latest_msg.from_}' "
            f"for company '{company_name}' (Subject: '{latest_msg.subject}')"
        )

        # Persist in DB
        recorded = await record_reply_in_database(
            email_id=email_id,
            company_id=company_id,
            incoming_msg=latest_msg,
            replies_list=replies_list,
        )

        if recorded:
            latest_snippet = (latest_msg.text or latest_msg.html or "").strip()[:600]
            latest_date = latest_msg.date or datetime.now(timezone.utc)
            latest_date_iso = (
                latest_date.isoformat() if hasattr(latest_date, "isoformat") else str(latest_date)
            )
            # Fire webhook to trigger mobile notification and update reply counter in the app
            await broadcast_reply_notification(
                org_id=org_id,
                company_id=company_id,
                email_id=email_id,
                company_name=company_name,
                sender_email=latest_msg.from_ or "Prospect",
                subject=latest_msg.subject or sent.get("subject") or "Outreach",
                snippet=latest_snippet,
                replied_at=latest_date_iso,
                reply_count=len(replies_list),
                replies=replies_list,
            )

            for m in matched_msgs:
                reply_item = DetectedReply(
                    email_id=email_id,
                    org_id=org_id,
                    company_id=company_id,
                    company_name=company_name,
                    sender=m.from_ or "",
                    subject=m.subject or "",
                    snippet=(m.text or m.html or "")[:300],
                    date=m.date or datetime.now(timezone.utc),
                    message_id=m.headers.get("message-id", [None])[0]
                    if isinstance(m.headers.get("message-id"), list)
                    else m.headers.get("message-id"),
                )
                detected.append(reply_item)

    logger.info(f"[IMAP REPLY CHECK] Finished. Total replies detected: {len(detected)}.")
    return detected


async def detect_replies_for_all_active_orgs() -> list[DetectedReply]:
    """
    Find all organizations that currently have emails in 'sent' status
    and run IMAP reply detection for each of them in the worker.
    """
    supabase = await get_supabase_client()
    try:
        res = await (
            supabase.table(EMAILS_TABLE)
            .select("sent_by_org_id")
            .eq("status", "sent")
            .execute()
        )
        rows = res.data or []
        org_ids = sorted({str(r["sent_by_org_id"]) for r in rows if r.get("sent_by_org_id")})
    except Exception as exc:
        logger.warning(f"[IMAP REPLY CHECK] Could not query active orgs with sent emails: {exc}")
        return []

    all_detected: list[DetectedReply] = []
    for org_id in org_ids:
        try:
            replies = await detect_replies_for_org(org_id)
            all_detected.extend(replies)
        except Exception as org_err:
            logger.error(f"[IMAP REPLY CHECK] Error checking replies for org {org_id}: {org_err}")

    return all_detected
