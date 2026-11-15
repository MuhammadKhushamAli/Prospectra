"""Asynchronous SMTP email dispatching service powered by aiosmtplib."""

from __future__ import annotations

import asyncio
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
import ssl
from typing import Any, Tuple

import aiosmtplib

from app.core.logging_config import get_node_logger
from app.email.models import EmailCredentials

logger = get_node_logger("smtp_sender")


def extract_email_domain(email_address: str) -> str:
    """Extract domain from an email address for Message-ID generation."""
    if "@" in email_address:
        return email_address.split("@", 1)[1].strip().lower()
    return "prospectra.ai"


def create_outreach_mime_message(
    sender: str,
    recipient: str,
    subject: str,
    body_text: str,
    sender_name: str | None = None,
    reply_to: str | None = None,
    custom_message_id: str | None = None,
) -> tuple[EmailMessage, str]:
    """
    Construct a standards-compliant MIME EmailMessage with RFC-5322 Message-ID
    and threading headers so replies can be accurately detected via IMAP.
    """
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

    # Plain text email body with clean UTF-8 encoding
    message.set_content(body_text.strip(), subtype="plain", charset="utf-8")

    return message, message_id


def create_smtp_client(credentials: EmailCredentials, timeout: float = 15.0) -> aiosmtplib.SMTP:
    """
    Initialize an aiosmtplib.SMTP client configured with the proper security mode (STARTTLS or SSL/TLS).
    """
    is_implicit_ssl = (
        credentials.smtp_port == 465
        or credentials.smtp_used.upper() == "SSL/TLS"
    )

    # SSL context with default verification
    ssl_context = ssl.create_default_context()

    return aiosmtplib.SMTP(
        hostname=credentials.smtp_server,
        port=credentials.smtp_port,
        use_tls=is_implicit_ssl,
        start_tls=False,  # If STARTTLS, handled manually or via client.starttls()
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
    """
    Dispatch a single message to one recipient.
    Returns: (success: bool, message_id: str, error_message: str | None)
    """
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
        logger.info(f"  [SMTP SENT] Outreach delivered to {recipient} (Message-ID: {msg_id})")
        return True, msg_id, None
    except Exception as exc:
        err_msg = f"Failed to send to {recipient}: {str(exc)}"
        logger.error(f"  [SMTP ERROR] {err_msg}")
        return False, msg_id, str(exc)


async def dispatch_outreach_emails(
    credentials: EmailCredentials,
    recipients: list[str],
    subject: str,
    body: str,
    reply_to: str | None = None,
) -> tuple[list[str], list[str], list[dict[str, str]]]:
    """
    Dispatch outreach emails to one or multiple selected recipients over SMTP using a single connection.
    Returns:
        (successful_recipients, message_ids, failed_recipients)
    """
    if not recipients:
        raise ValueError("At least one recipient email address must be provided.")

    clean_recipients = [r.strip() for r in recipients if r and r.strip()]
    if not clean_recipients:
        raise ValueError("No valid recipient email addresses found.")

    successful_recipients: list[str] = []
    message_ids: list[str] = []
    failed_recipients: list[dict[str, str]] = []

    client = create_smtp_client(credentials)

    try:
        logger.info(
            f"[SMTP CONNECT] Connecting to {credentials.smtp_server}:{credentials.smtp_port} "
            f"(Security: {credentials.smtp_used})..."
        )
        await client.connect()
        logger.info(f"[SMTP CONNECTED] Connected to {credentials.smtp_server}:{credentials.smtp_port}")

        # Handle STARTTLS if configured and port is not implicit SSL (465)
        if credentials.smtp_port != 465 and credentials.smtp_used.upper() == "STARTTLS":
            logger.info("  [SMTP STARTTLS] Upgrading connection with STARTTLS...")
            await client.starttls()

        if credentials.smtp_password:
            logger.info(f"  [SMTP AUTH] Authenticating as '{credentials.smtp_username}'...")
            await client.login(credentials.smtp_username, credentials.smtp_password)

        # Dispatch to each recipient
        for target_email in clean_recipients:
            success, msg_id, err = await send_single_recipient_email(
                client=client,
                sender=credentials.sender_email,
                recipient=target_email,
                subject=subject,
                body=body,
                sender_name=credentials.sender_name,
                reply_to=reply_to,
            )
            if success:
                successful_recipients.append(target_email)
                message_ids.append(msg_id)
            else:
                failed_recipients.append({"email": target_email, "error": err or "Unknown error"})

    except Exception as conn_err:
        logger.error(f"[SMTP CONNECTION FAILED] {str(conn_err)}")
        # Mark all unsent recipients as failed
        for remaining in clean_recipients:
            if remaining not in successful_recipients:
                failed_recipients.append({"email": remaining, "error": str(conn_err)})
    finally:
        try:
            if client.is_connected:
                await client.quit()
        except Exception:
            pass

    return successful_recipients, message_ids, failed_recipients
