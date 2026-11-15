"""Helper functions for resolving IMAP hosts and extracting SMTP credentials from DB rows."""

from __future__ import annotations

from typing import Any

from app.core.logging_config import get_node_logger
from app.utils.constants.db_tables import ORGANIZATIONS_TABLE
from app.utils.constants.email_constants import DEFAULT_IMAP_PORT, DEFAULT_IMAP_SERVERS, DEFAULT_SMTP_PORT

logger = get_node_logger("email_credentials")


def resolve_default_imap_host(
    esp_provider: str,
    smtp_server: str,
    explicit_imap_server: str | None = None,
    explicit_imap_port: int | None = None,
) -> tuple[str, int]:
    """Resolve the IMAP server and port for a given provider or SMTP server."""
    if explicit_imap_server and explicit_imap_server.strip():
        port = explicit_imap_port if (explicit_imap_port and explicit_imap_port > 0) else DEFAULT_IMAP_PORT
        return explicit_imap_server.strip(), port

    if esp_provider in DEFAULT_IMAP_SERVERS:
        return DEFAULT_IMAP_SERVERS[esp_provider]

    clean_smtp = (smtp_server or "").strip().lower()
    if clean_smtp.startswith("smtp."):
        return "imap." + clean_smtp[5:], DEFAULT_IMAP_PORT
    if clean_smtp.startswith("mail."):
        return clean_smtp, DEFAULT_IMAP_PORT

    return clean_smtp or "imap.gmail.com", DEFAULT_IMAP_PORT


def extract_smtp_fields_from_row(row: dict[str, Any]) -> dict[str, Any]:
    """Extract normalized sender_email, SMTP, and ESP fields from a domain_verifications row."""
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
        or DEFAULT_SMTP_PORT
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

    sender_name = (
        row.get("sender_name")
        or smtp_config.get("sender_name")
        or ""
    ).strip() or None

    explicit_imap = row.get("imap_server") or smtp_config.get("imap_server")
    explicit_imap_port = row.get("imap_port") or smtp_config.get("imap_port")

    return {
        "sender_email": sender_email,
        "smtp_server": smtp_server,
        "smtp_port": smtp_port,
        "smtp_used": smtp_used,
        "smtp_username": smtp_username,
        "smtp_password": smtp_password,
        "esp_provider": esp_provider,
        "sender_name": sender_name,
        "explicit_imap": explicit_imap,
        "explicit_imap_port": explicit_imap_port,
    }


async def fetch_org_sender_name(
    supabase: Any,
    org_id: str,
    table_name: str = ORGANIZATIONS_TABLE,
) -> str | None:
    """Fetch organization display name for the From header ('Company Name <email>')."""
    try:
        org_res = await (
            supabase.table(table_name)
            .select("name")
            .eq("id", org_id)
            .limit(1)
            .execute()
        )
        if org_res.data and org_res.data[0].get("name"):
            return str(org_res.data[0]["name"]).strip() or None
    except Exception as exc:
        logger.warning(f"Could not fetch organization name for org_id={org_id}: {exc}")
    return None
