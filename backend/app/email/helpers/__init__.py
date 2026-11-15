"""Email dispatch, SMTP, and IMAP helper modules."""

from .credentials_helpers import (
    extract_smtp_fields_from_row,
    fetch_org_sender_name,
    resolve_default_imap_host,
)
from .imap_db_helpers import (
    broadcast_reply_notification,
    fetch_active_org_ids_with_sent_emails,
    fetch_mailbox_messages,
    get_sent_emails_for_org,
    record_reply_in_database,
)
from .imap_matching_helpers import (
    build_detected_reply_objects,
    build_reply_items_from_messages,
    clean_header_id,
    extract_header_ids,
    is_message_reply_to_email,
    normalize_subject,
)
from .mime_helpers import (
    create_outreach_mime_message,
    create_smtp_client,
    extract_email_domain,
    send_single_recipient_email,
)
from .outreach_db_helpers import (
    fetch_email_with_company,
    format_send_email_summary,
    lookup_company_recipient_emails,
    mark_email_and_company_sent,
)

__all__ = [
    "broadcast_reply_notification",
    "build_detected_reply_objects",
    "build_reply_items_from_messages",
    "clean_header_id",
    "create_outreach_mime_message",
    "create_smtp_client",
    "extract_email_domain",
    "extract_header_ids",
    "extract_smtp_fields_from_row",
    "fetch_active_org_ids_with_sent_emails",
    "fetch_email_with_company",
    "fetch_mailbox_messages",
    "fetch_org_sender_name",
    "format_send_email_summary",
    "get_sent_emails_for_org",
    "is_message_reply_to_email",
    "lookup_company_recipient_emails",
    "mark_email_and_company_sent",
    "normalize_subject",
    "record_reply_in_database",
    "resolve_default_imap_host",
    "send_single_recipient_email",
]
