"""Asynchronous SMTP email dispatching service powered by aiosmtplib."""

from __future__ import annotations

from app.core.logging_config import get_node_logger
from app.email.helpers.mime_helpers import (
    create_outreach_mime_message,
    create_smtp_client,
    extract_email_domain,
    send_single_recipient_email,
)
from app.email.models import EmailCredentials, RecipientDispatchFailure
from app.utils.constants.email_constants import DEFAULT_SSL_SMTP_PORT

logger = get_node_logger("smtp_sender")


async def dispatch_outreach_emails(
    credentials: EmailCredentials,
    recipients: list[str],
    subject: str,
    body: str,
    reply_to: str | None = None,
) -> tuple[list[str], list[str], list[dict[str, str]]]:
    """Dispatch outreach emails to one or multiple selected recipients over SMTP using a single connection."""
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
        await client.connect()

        if credentials.smtp_port != DEFAULT_SSL_SMTP_PORT and credentials.smtp_used.upper() == "STARTTLS":
            await client.starttls()

        if credentials.smtp_password:
            await client.login(credentials.smtp_username, credentials.smtp_password)

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
                failed_recipients.append(
                    RecipientDispatchFailure(
                        email=target_email,
                        error=err or "Unknown error",
                    ).to_dict()
                )
        logger.info(
            f"[SMTP SEND] {credentials.smtp_server}:{credentials.smtp_port}: "
            f"{len(successful_recipients)}/{len(clean_recipients)} sent ({len(failed_recipients)} failed)."
        )

    except Exception as conn_err:
        logger.error(f"[SMTP CONNECTION FAILED] {str(conn_err)}")
        for remaining in clean_recipients:
            if remaining not in successful_recipients:
                failed_recipients.append(
                    RecipientDispatchFailure(
                        email=remaining,
                        error=str(conn_err),
                    ).to_dict()
                )
    finally:
        try:
            if client.is_connected:
                await client.quit()
        except Exception:
            pass

    return successful_recipients, message_ids, failed_recipients


__all__ = [
    "create_outreach_mime_message",
    "create_smtp_client",
    "dispatch_outreach_emails",
    "extract_email_domain",
    "send_single_recipient_email",
]
