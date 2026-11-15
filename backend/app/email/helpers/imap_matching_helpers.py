"""IMAP message header normalization, reply thread matching, and reply item formatting helpers."""

from __future__ import annotations

import re
from typing import Any

from imap_tools import MailMessage

from app.email.models import DetectedReply, ReplySummaryItem
from app.utils.helpers.time_helpers import format_timestamp, utc_now


def clean_header_id(raw_id: str | None) -> str:
    """Normalize Message-ID, In-Reply-To, or References headers by stripping brackets and whitespace."""
    if not raw_id:
        return ""
    return raw_id.strip().strip("<>").strip().lower()


def extract_header_ids(raw_header: str | list | None) -> set[str]:
    """Extract all Message-IDs from a header string or list."""
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
    """Check if an incoming IMAP message is a reply to a sent email record."""
    sent_msg_id = clean_header_id(sent_email.get("message_id"))
    recipient_email = (sent_email.get("recipient_email") or "").strip().lower()
    known_recipients = set(sent_email.get("recipient_emails") or [])
    if recipient_email:
        known_recipients.add(recipient_email)

    if sent_msg_id:
        in_reply_to = msg.headers.get("in-reply-to")
        references = msg.headers.get("references")
        incoming_ids = extract_header_ids(in_reply_to) | extract_header_ids(references)
        if sent_msg_id in incoming_ids:
            return True

    incoming_sender = (msg.from_ or "").strip().lower()
    if any(incoming_sender == r.lower() for r in known_recipients if r):
        sent_subject = normalize_subject(sent_email.get("subject"))
        incoming_subject = normalize_subject(msg.subject)
        if sent_subject and incoming_subject:
            if sent_subject in incoming_subject or incoming_subject in sent_subject:
                return True

    return False


def build_reply_items_from_messages(
    matched_msgs: list[MailMessage],
    email_id: str,
    fallback_subject: str | None = None,
) -> list[dict[str, Any]]:
    """Build serializable reply dictionaries from matched MailMessage objects via ReplySummaryItem."""
    replies_list: list[dict[str, Any]] = []
    for idx, m in enumerate(matched_msgs):
        raw_msg_id = (
            m.headers.get("message-id", [None])[0]
            if isinstance(m.headers.get("message-id"), list)
            else m.headers.get("message-id")
        )
        date_iso = format_timestamp(m.date or utc_now())
        item = ReplySummaryItem(
            id=str(raw_msg_id or f"reply-{email_id}-{idx}"),
            sender=m.from_ or "Prospect",
            subject=m.subject or fallback_subject or "Re: Outreach",
            snippet=(m.text or m.html or "").strip()[:1000],
            date=date_iso,
        )
        replies_list.append(item.to_dict())
    return replies_list


def build_detected_reply_objects(
    matched_msgs: list[MailMessage],
    email_id: str,
    org_id: str,
    company_id: str,
    company_name: str,
) -> list[DetectedReply]:
    """Convert matched MailMessage instances into DetectedReply objects."""
    detected: list[DetectedReply] = []
    for m in matched_msgs:
        detected.append(
            DetectedReply(
                email_id=email_id,
                org_id=org_id,
                company_id=company_id,
                company_name=company_name,
                sender=m.from_ or "",
                subject=m.subject or "",
                snippet=(m.text or m.html or "")[:300],
                date=m.date or utc_now(),
                message_id=(
                    m.headers.get("message-id", [None])[0]
                    if isinstance(m.headers.get("message-id"), list)
                    else m.headers.get("message-id")
                ),
            )
        )
    return detected
