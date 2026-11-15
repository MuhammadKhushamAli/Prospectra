"""Credentials loader and host resolver for SMTP and IMAP."""

from __future__ import annotations

from app.core.logging_config import get_node_logger
from app.email.helpers.credentials_helpers import (
    extract_smtp_fields_from_row,
    fetch_org_sender_name,
    resolve_default_imap_host,
)
from app.email.models import EmailCredentials
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import DOMAIN_VERIFICATIONS_TABLE, ORGANIZATIONS_TABLE
from app.utils.constants.email_constants import DEFAULT_IMAP_SERVERS

logger = get_node_logger("email_credentials")


async def fetch_org_email_credentials(org_id: str) -> EmailCredentials:
    """Fetch and validate the verified email, SMTP, and IMAP credentials for an organization."""
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
    sender_email = fields["sender_email"]
    smtp_server = fields["smtp_server"]
    smtp_password = fields["smtp_password"]

    if not sender_email or not smtp_server or not smtp_password:
        raise ValueError(
            "Sender email or SMTP password not found in your verified domain configuration. "
            "Please configure your email credentials in the Onboarding Email Verification settings."
        )

    sender_name = fields["sender_name"] or await fetch_org_sender_name(
        supabase=supabase,
        org_id=org_id,
        table_name=ORGANIZATIONS_TABLE,
    )

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
        smtp_username=fields["smtp_username"],
        smtp_password=smtp_password,
        imap_server=imap_server,
        imap_port=imap_port,
        esp_provider=fields["esp_provider"],
        sender_name=sender_name,
    )


__all__ = [
    "DEFAULT_IMAP_SERVERS",
    "DOMAIN_VERIFICATIONS_TABLE",
    "ORGANIZATIONS_TABLE",
    "fetch_org_email_credentials",
    "resolve_default_imap_host",
]
