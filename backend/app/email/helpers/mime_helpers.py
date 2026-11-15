"""MIME message construction and aiosmtplib client helpers."""

from __future__ import annotations

from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
import ssl

import aiosmtplib

from app.core.logging_config import get_node_logger
from app.email.models import EmailCredentials
from app.utils.constants.email_constants import DEFAULT_SSL_SMTP_PORT
from app.utils.helpers.domain_helpers import extract_sender_domain_or_default

logger = get_node_logger("smtp_sender")


def extract_email_domain(email_address: str) -> str:
    """Extract domain from an email address for Message-ID generation."""
    return extract_sender_domain_or_default(email_address)


def create_outreach_mime_message(
    sender: str,
    recipient: str,
    subject: str,
    body_text: str,
    sender_name: str | None = None,
    reply_to: str | None = None,
    custom_message_id: str | None = None,
) -> tuple[EmailMessage, str]:
    """Construct a standards-compliant MIME EmailMessage with RFC-5322 Message-ID and From display name."""
    domain = extract_email_domain(sender)
    message_id = custom_message_id or make_msgid(domain=domain)

    clean_sender = sender.strip()
    clean_sender_name = (sender_name or "").strip()

    message = EmailMessage()
    message["From"] = (
        formataddr((clean_sender_name, clean_sender))
        if clean_sender_name
        else clean_sender
    )
    message["To"] = recipient.strip()
    message["Subject"] = subject.strip()
    message["Date"] = formatdate(localtime=True)
    message["Message-ID"] = message_id

    if reply_to and reply_to.strip():
        message["Reply-To"] = reply_to.strip()

    message.set_content(body_text.strip(), subtype="plain", charset="utf-8")
    return message, message_id


def create_smtp_client(credentials: EmailCredentials, timeout: float = 15.0) -> aiosmtplib.SMTP:
    """Initialize an aiosmtplib.SMTP client configured with STARTTLS or SSL/TLS."""
    is_implicit_ssl = (
        credentials.smtp_port == DEFAULT_SSL_SMTP_PORT
        or credentials.smtp_used.upper() == "SSL/TLS"
    )
    ssl_context = ssl.create_default_context()

    return aiosmtplib.SMTP(
        hostname=credentials.smtp_server,
        port=credentials.smtp_port,
        use_tls=is_implicit_ssl,
        start_tls=False,
        timeout=timeout,
        tls_context=ssl_context,
    )


async def send_single_recipient_email(
    client: aiosmtplib.SMTP,
    sender: str,
    recipient: str,
    subject: str,
    body: str,
    sender_name: str | None = None,
    reply_to: str | None = None,
) -> tuple[bool, str, str | None]:
    """Dispatch a single message to one recipient and return (success, message_id, error)."""
    msg, msg_id = create_outreach_mime_message(
        sender=sender,
        recipient=recipient,
        subject=subject,
        body_text=body,
        sender_name=sender_name,
        reply_to=reply_to or sender,
    )

    try:
        await client.send_message(msg, sender=sender, recipients=[recipient])
        return True, msg_id, None
    except Exception as exc:
        err_msg = f"Failed to send to {recipient}: {str(exc)}"
        logger.error(f"[SMTP ERROR] {err_msg}")
        return False, msg_id, str(exc)
