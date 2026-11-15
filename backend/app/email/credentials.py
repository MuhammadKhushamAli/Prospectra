"""Credentials loader and host resolver for SMTP and IMAP."""

from __future__ import annotations

from typing import Any
from app.core.logging_config import get_node_logger
from app.email.models import EmailCredentials
from app.services.supabase import get_supabase_client

logger = get_node_logger("email_credentials")

DOMAIN_VERIFICATIONS_TABLE = "domain_verifications"

# Standard IMAP configurations mapped from known ESP providers
DEFAULT_IMAP_SERVERS: dict[str, tuple[str, int]] = {
    "google_workspace": ("imap.gmail.com", 993),
    "microsoft_365": ("outlook.office365.com", 993),
    "zoho": ("imap.zoho.com", 993),
    "hostinger": ("imap.hostinger.com", 993),
}


def resolve_default_imap_host(
    esp_provider: str,
    smtp_server: str,
    explicit_imap_server: str | None = None,
    explicit_imap_port: int | None = None,
) -> tuple[str, int]:
    """
    Resolve the IMAP server and port for a given provider or SMTP server.
    Prefers explicit configurations, then known ESP presets, then intelligent heuristics.
    """
    if explicit_imap_server and explicit_imap_server.strip():
        port = explicit_imap_port if (explicit_imap_port and explicit_imap_port > 0) else 993
        return explicit_imap_server.strip(), port

    if esp_provider in DEFAULT_IMAP_SERVERS:
        return DEFAULT_IMAP_SERVERS[esp_provider]

    # Heuristic resolution for custom / private servers:
    # 1. smtp.example.com -> imap.example.com
    # 2. mail.example.com -> mail.example.com
    clean_smtp = (smtp_server or "").strip().lower()
    if clean_smtp.startswith("smtp."):
        inferred = "imap." + clean_smtp[5:]
        return inferred, 993
    elif clean_smtp.startswith("mail."):
        return clean_smtp, 993

    return clean_smtp or "imap.gmail.com", 993


async def fetch_org_email_credentials(org_id: str) -> EmailCredentials:
    """
    Fetch and validate the verified email, SMTP, and IMAP credentials for an organization.
    Raises ValueError if email/SMTP is not verified or credentials are missing.
    """
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

    row = res.data[0]
    dns_records = row.get("dns_records") or {}
    smtp_config = dns_records.get("smtp_config") or {}

    sender_email = (
        row.get("sender_email")
        or smtp_config.get("sender_email")
        or ""
    ).strip()

    smtp_server = (
        row.get("smtp_server")
        or smtp_config.get("smtp_server")
        or ""
    ).strip()

    smtp_port = int(
        row.get("smtp_port")
        or smtp_config.get("smtp_port")
        or 587
    )

    smtp_used = (
        row.get("smtp_used")
        or smtp_config.get("smtp_used")
        or "STARTTLS"
    ).strip()

    smtp_username = (
        row.get("smtp_username")
        or smtp_config.get("smtp_username")
        or sender_email
    ).strip()

    smtp_password = (
        row.get("smtp_password")
        or smtp_config.get("smtp_password")
        or ""
    ).strip()

    esp_provider = (
        row.get("esp_provider")
        or smtp_config.get("esp_provider")
        or "google_workspace"
    )

    if not sender_email or not smtp_server or not smtp_password:
        raise ValueError(
            "Sender email or SMTP password not found in your verified domain configuration. "
            "Please configure your email credentials in the Onboarding Email Verification settings."
        )

    # Resolve IMAP configuration
    explicit_imap = row.get("imap_server") or smtp_config.get("imap_server")
    explicit_imap_port = row.get("imap_port") or smtp_config.get("imap_port")
    imap_server, imap_port = resolve_default_imap_host(
        esp_provider=esp_provider,
        smtp_server=smtp_server,
        explicit_imap_server=explicit_imap,
        explicit_imap_port=explicit_imap_port,
    )

    return EmailCredentials(
        org_id=org_id,
        sender_email=sender_email,
        smtp_server=smtp_server,
        smtp_port=smtp_port,
        smtp_used=smtp_used,
        smtp_username=smtp_username,
        smtp_password=smtp_password,
        imap_server=imap_server,
        imap_port=imap_port,
        esp_provider=esp_provider,
    )
