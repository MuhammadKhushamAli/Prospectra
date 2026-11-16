"""Credentials loader and host resolver for SMTP and IMAP."""

from __future__ import annotations

from app.core.logging_config import get_node_logger
from app.email.helpers.credentials_helpers import (
    extract_smtp_fields_from_row,
    fetch_org_sender_name,
    fetch_user_profile_email,
    resolve_default_imap_host,
)
from app.email.models import EmailCredentials
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import DOMAIN_VERIFICATIONS_TABLE, ORGANIZATIONS_TABLE
from app.utils.constants.email_constants import DEFAULT_IMAP_SERVERS

logger = get_node_logger("email_credentials")


async def fetch_sender_credentials(
    org_id: str,
    user_id: str | None = None,
) -> EmailCredentials:
    """Fetch verified SMTP credentials for an org, resolving sender email from user profile."""
    if not org_id:
        raise ValueError("Organization ID is required to fetch email credentials.")

    supabase = await get_supabase_client()
    res = await (
        supabase.table(DOMAIN_VERIFICATIONS_TABLE)
        .select("*")
        .eq("org_id", org_id)
        .limit(1)
        .execute()
    )

    if not res.data:
        raise ValueError(
            "No domain verification record found. Please verify your domain and SMTP credentials first."
        )

    fields = extract_smtp_fields_from_row(res.data[0])
    smtp_server = fields["smtp_server"]
    smtp_password = fields["smtp_password"]
    smtp_username = fields["smtp_username"]

    if not smtp_server or not smtp_password:
        raise ValueError(
            "SMTP server or password not found in your verified domain configuration. "
            "Please configure your email credentials in Domain & Email Verification settings."
        )

    # 1. Resolve sender email: profile email if user_id is provided, otherwise fallback
    sender_email = None
    if user_id:
        sender_email = await fetch_user_profile_email(supabase, org_id, user_id)

    if not sender_email:
        sender_email = fields.get("sender_email") or smtp_username

    if not sender_email:
        raise ValueError(
            "Could not determine sender email. Please ensure your profile email is complete."
        )

    # 2. Resolve sender name (defaults to company name for From: "<Company Name>" <email>)
    sender_name = await fetch_org_sender_name(
        supabase=supabase,
        org_id=org_id,
        table_name=ORGANIZATIONS_TABLE,
    ) or fields["sender_name"]

    imap_server, imap_port = resolve_default_imap_host(
        esp_provider=fields["esp_provider"],
        smtp_server=smtp_server,
        explicit_imap_server=fields["explicit_imap"],
        explicit_imap_port=fields["explicit_imap_port"],
    )

    return EmailCredentials(
        org_id=org_id,
        sender_email=sender_email,
        smtp_server=smtp_server,
        smtp_port=fields["smtp_port"],
        smtp_used=fields["smtp_used"],
        smtp_username=smtp_username,
        smtp_password=smtp_password,
        imap_server=imap_server,
        imap_port=imap_port,
        esp_provider=fields["esp_provider"],
        sender_name=sender_name,
    )


async def fetch_org_email_credentials(
    org_id: str,
    user_id: str | None = None,
) -> EmailCredentials:
    """Fetch and validate the verified email, SMTP, and IMAP credentials."""
    return await fetch_sender_credentials(org_id, user_id)


__all__ = [
    "DEFAULT_IMAP_SERVERS",
    "DOMAIN_VERIFICATIONS_TABLE",
    "ORGANIZATIONS_TABLE",
    "fetch_org_email_credentials",
    "fetch_sender_credentials",
    "resolve_default_imap_host",
]
