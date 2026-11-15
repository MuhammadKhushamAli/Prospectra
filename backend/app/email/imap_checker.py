"""IMAP reply detection service using imap-tools for automated response tracking."""

from __future__ import annotations

import asyncio

from app.core.logging_config import get_node_logger
from app.email.credentials import fetch_org_email_credentials
from app.email.helpers.imap_db_helpers import (
    broadcast_reply_notification,
    fetch_active_org_ids_with_sent_emails,
    fetch_mailbox_messages,
    get_sent_emails_for_org,
    record_reply_in_database,
)
from app.email.helpers.imap_matching_helpers import (
    build_detected_reply_objects,
    build_reply_items_from_messages,
    clean_header_id,
    extract_header_ids,
    is_message_reply_to_email,
    normalize_subject,
)
from app.email.models import DetectedReply
from app.utils.constants.db_tables import COMPANIES_TABLE, EMAILS_TABLE
from app.utils.helpers.time_helpers import format_timestamp, utc_now

logger = get_node_logger("imap_checker")


async def detect_replies_for_org(org_id: str) -> list[DetectedReply]:
    """Check the mailbox for an organization, correlate incoming messages with sent outreach, and notify."""
    try:
        credentials = await fetch_org_email_credentials(org_id)
    except Exception as cred_err:
        logger.warning(f"Cannot run reply detection for org {org_id}: {cred_err}")
        return []

    sent_emails = await get_sent_emails_for_org(org_id)
    if not sent_emails:
        logger.info(f"[IMAP REPLY CHECK] Org {org_id}: 0 sent emails awaiting replies.")
        return []

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

        replies_list = build_reply_items_from_messages(
            matched_msgs=matched_msgs,
            email_id=email_id,
            fallback_subject=sent.get("subject"),
        )

        recorded = await record_reply_in_database(
            email_id=email_id,
            company_id=company_id,
            incoming_msg=latest_msg,
            replies_list=replies_list,
        )

        if recorded:
            latest_snippet = (latest_msg.text or latest_msg.html or "").strip()[:600]
            latest_date_iso = format_timestamp(latest_msg.date or utc_now())
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

            detected.extend(
                build_detected_reply_objects(
                    matched_msgs=matched_msgs,
                    email_id=email_id,
                    org_id=org_id,
                    company_id=company_id,
                    company_name=company_name,
                )
            )

    logger.info(
        f"[IMAP REPLY CHECK] Org {org_id}: inspected {len(messages)} message(s) "
        f"against {len(sent_emails)} sent email(s) -> {len(detected)} reply(s) detected."
    )
    return detected


async def detect_replies_for_all_active_orgs() -> list[DetectedReply]:
    """Find all organizations that currently have emails in 'sent' status and run IMAP reply detection."""
    org_ids = await fetch_active_org_ids_with_sent_emails()
    all_detected: list[DetectedReply] = []
    for org_id in org_ids:
        try:
            replies = await detect_replies_for_org(org_id)
            all_detected.extend(replies)
        except Exception as org_err:
            logger.error(f"[IMAP REPLY CHECK] Error checking replies for org {org_id}: {org_err}")
    return all_detected


__all__ = [
    "COMPANIES_TABLE",
    "EMAILS_TABLE",
    "broadcast_reply_notification",
    "clean_header_id",
    "detect_replies_for_all_active_orgs",
    "detect_replies_for_org",
    "extract_header_ids",
    "fetch_mailbox_messages",
    "get_sent_emails_for_org",
    "is_message_reply_to_email",
    "normalize_subject",
    "record_reply_in_database",
]
