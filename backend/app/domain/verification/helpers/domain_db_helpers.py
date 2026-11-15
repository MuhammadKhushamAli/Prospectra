"""Supabase database persistence helpers for domain and email/SMTP verification."""

from __future__ import annotations

from dataclasses import asdict
import logging
from typing import Any

from app.domain.verification.models import (
    CustomEspProviderConfig,
    EmailVerificationStoredDetails,
    SmtpStoredConfig,
)
from app.models.dns_record import DNSRecord
from app.models.domain_verification import DomainVerification
from app.utils.constants.db_tables import DOMAIN_VERIFICATION_TABLE, ESP_PROVIDERS_TABLE
from app.utils.constants.email_constants import BUILTIN_ESP_ENUM_VALUES
from app.utils.helpers.time_helpers import utc_now_iso

logger = logging.getLogger(__name__)


async def fetch_existing_domain_record(
    supabase_client: Any,
    org_id: str,
    table_name: str = DOMAIN_VERIFICATION_TABLE,
) -> dict[str, Any] | None:
    """Query Supabase for an organization's existing domain_verifications record."""
    try:
        resp = await (
            supabase_client
            .table(table_name)
            .select("*")
            .eq("org_id", org_id)
            .limit(1)
            .execute()
        )
        if resp and resp.data:
            return dict(resp.data[0])
    except Exception as exc:
        logger.warning("Could not query existing domain verification for org %s: %s", org_id, exc)
    return None


async def upsert_initial_domain_verification(
    supabase_client: Any,
    org_id: str,
    normalized_domain: str,
    host: str,
    token: str,
    existing_dns: dict[str, Any],
    clean_smtp_username: str | None = None,
    table_name: str = DOMAIN_VERIFICATION_TABLE,
) -> None:
    """Create and upsert a new domain_verifications row with its TXT token and optional smtp_username."""
    dns_payload = asdict(
        DNSRecord(
            type="TXT",
            name=host,
            value=token,
        )
    )
    if clean_smtp_username:
        dns_payload["smtp_config"] = {
            **(existing_dns.get("smtp_config") if isinstance(existing_dns.get("smtp_config"), dict) else {}),
            "smtp_username": clean_smtp_username,
        }

    verification = DomainVerification(
        org_id=org_id,
        domain=normalized_domain,
        dns_records=dns_payload,
        verification_status="pending",
        verified_at=None,
        created_at=None,
    )

    row = asdict(verification)
    row.pop("created_at")
    if clean_smtp_username:
        row["smtp_username"] = clean_smtp_username
    try:
        await supabase_client.table(table_name).upsert(
            row,
            on_conflict="org_id",
        ).execute()
    except Exception:
        row_fallback = dict(row)
        row_fallback.pop("smtp_username", None)
        try:
            await supabase_client.table(table_name).upsert(
                row_fallback,
                on_conflict="org_id",
            ).execute()
        except Exception:
            await supabase_client.table(table_name).upsert(
                row_fallback,
                on_conflict="org_id,domain",
            ).execute()


async def update_existing_domain_verification(
    supabase_client: Any,
    org_id: str,
    normalized_domain: str,
    verified: bool,
    existing_record: dict[str, Any],
    existing_dns: dict[str, Any],
    clean_smtp_username: str | None = None,
    table_name: str = DOMAIN_VERIFICATION_TABLE,
) -> None:
    """Update domain or smtp_username on an existing domain_verifications row."""
    update_fields: dict[str, Any] = {}
    if existing_record.get("domain") != normalized_domain and not verified:
        update_fields["domain"] = normalized_domain
    if clean_smtp_username:
        updated_dns = {
            **existing_dns,
            "smtp_config": {
                **(existing_dns.get("smtp_config") if isinstance(existing_dns.get("smtp_config"), dict) else {}),
                "smtp_username": clean_smtp_username,
            },
        }
        update_fields["dns_records"] = updated_dns
        update_fields["smtp_username"] = clean_smtp_username
    if not update_fields:
        return

    try:
        await supabase_client.table(table_name).update(
            update_fields
        ).eq("org_id", org_id).execute()
    except Exception:
        fallback_fields = dict(update_fields)
        fallback_fields.pop("smtp_username", None)
        if fallback_fields:
            try:
                await supabase_client.table(table_name).update(
                    fallback_fields
                ).eq("org_id", org_id).execute()
            except Exception:
                pass


def resolve_stored_smtp_username(
    clean_smtp_username: str | None,
    existing_record: dict[str, Any] | None,
    existing_dns: dict[str, Any],
) -> str | None:
    """Resolve the effective smtp_username from input, top-level column, or dns_records.smtp_config."""
    return (
        clean_smtp_username
        or (existing_record.get("smtp_username") if existing_record else None)
        or (
            existing_dns.get("smtp_config", {}).get("smtp_username")
            if isinstance(existing_dns.get("smtp_config"), dict)
            else None
        )
    )


async def fetch_custom_esp_providers(
    supabase_client: Any,
    esp_table: str = ESP_PROVIDERS_TABLE,
) -> dict[str, dict[str, Any]]:
    """Fetch custom ESP providers from the esp_providers table via CustomEspProviderConfig."""
    custom_map: dict[str, dict[str, Any]] = {}
    try:
        resp = await supabase_client.table(esp_table).select("*").execute()
        for row in resp.data or []:
            pid = str(row.get("id") or "").strip().lower()
            if not pid or pid == "other":
                continue
            config = CustomEspProviderConfig(
                id=pid,
                label=row.get("label") or pid,
                smtp_server=row.get("smtp_server") or "",
                smtp_port=int(row.get("smtp_port") or 587),
                smtp_used=row.get("smtp_used") or "STARTTLS",
                default_dkim_selectors=list(row.get("default_dkim_selectors") or ["default"]),
                is_custom=bool(row.get("is_custom")),
            )
            custom_map[pid] = config.to_dict()
    except Exception:
        pass
    return custom_map


def build_email_verification_db_payloads(
    result: Any,
    existing_dns_records: dict[str, Any],
    clean_smtp_username: str,
    clean_smtp_password: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Construct the updated dns_records and full column update payload after SMTP verification."""
    now_iso = utc_now_iso() if result.verified else None
    enum_esp_provider = (
        result.email_provider
        if result.email_provider in BUILTIN_ESP_ENUM_VALUES
        else "other"
    )
    stored_provider_value = result.email_provider_label or result.email_provider

    smtp_config = SmtpStoredConfig(
        sender_email=result.sender_email,
        esp_provider=enum_esp_provider,
        email_provider=stored_provider_value,
        email_provider_id=result.email_provider,
        is_custom_provider=result.is_custom_provider,
        smtp_used=result.smtp_used,
        smtp_server=result.smtp_server,
        smtp_port=result.smtp_port,
        smtp_username=clean_smtp_username,
        smtp_password=clean_smtp_password,
        dkim_selector=result.dkim_selector,
    )

    verification_details = EmailVerificationStoredDetails(
        status=result.verification_status,
        verified=result.verified,
        verified_at=now_iso,
        smtp_used=result.smtp_used,
        authentication_results_header=result.authentication_results_header,
        mx_valid=result.mx_valid,
        mx_records=list(result.mx_records),
        spf_valid=result.spf_valid,
        spf_record=result.spf_record,
        spf_result=result.spf_result,
        dmarc_valid=result.dmarc_valid,
        dmarc_record=result.dmarc_record,
        dmarc_policy=result.dmarc_policy,
        dkim_valid=result.dkim_valid,
        dkim_selector=result.dkim_selector,
        smtp_reachable=result.smtp_reachable,
        smtp_authenticated=result.smtp_authenticated,
        smtp_banner=result.smtp_banner,
        warnings=list(result.warnings),
        errors=list(result.errors),
    )

    updated_dns_records = {
        **existing_dns_records,
        "smtp_config": smtp_config.to_dict(),
        "email_verification": verification_details.to_dict(),
    }

    full_update_payload: dict[str, Any] = {
        "esp_provider": enum_esp_provider,
        "sender_email": result.sender_email,
        "email_provider": stored_provider_value,
        "smtp_used": result.smtp_used,
        "smtp_server": result.smtp_server,
        "smtp_port": result.smtp_port,
        "smtp_username": clean_smtp_username,
        "smtp_password": clean_smtp_password,
        "dkim_selector": result.dkim_selector,
        "email_verification_status": result.verification_status,
        "email_verified_at": now_iso,
        "email_verification_details": updated_dns_records["email_verification"],
        "dns_records": updated_dns_records,
    }
    return updated_dns_records, full_update_payload


async def persist_email_verification_payload(
    supabase_client: Any,
    org_id: str,
    updated_dns_records: dict[str, Any],
    full_update_payload: dict[str, Any],
    table_name: str = DOMAIN_VERIFICATION_TABLE,
) -> None:
    """Persist email & SMTP verification details into domain_verifications with schema fallback."""
    try:
        await (
            supabase_client
            .table(table_name)
            .update(full_update_payload)
            .eq("org_id", org_id)
            .execute()
        )
    except Exception:
        await (
            supabase_client
            .table(table_name)
            .update({"dns_records": updated_dns_records})
            .eq("org_id", org_id)
            .execute()
        )


async def register_custom_esp_provider(
    supabase_client: Any,
    result: Any,
    esp_table: str = ESP_PROVIDERS_TABLE,
) -> None:
    """Upsert a newly verified custom ESP provider into esp_providers via CustomEspProviderConfig."""
    if not (result.verified and result.is_custom_provider):
        return
    try:
        config = CustomEspProviderConfig(
            id=result.email_provider,
            label=result.email_provider_label or result.email_provider,
            smtp_server=result.smtp_server,
            smtp_port=result.smtp_port,
            smtp_used=result.smtp_used,
            default_dkim_selectors=[result.dkim_selector or "default"],
            is_custom=True,
        )
        await (
            supabase_client
            .table(esp_table)
            .upsert(config.to_dict(), on_conflict="id")
            .execute()
        )
    except Exception:
        pass
