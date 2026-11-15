"""Public operations for starting and completing domain and email/SMTP verification."""

from __future__ import annotations

import logging
from typing import Any

from app.domain.verification.dns import _VERIFICATION_HOST, is_verified, new_token, normalize_domain
from app.domain.verification.email_verifier import (
    BUILTIN_ESP_ENUM_VALUES,
    EmailSmtpVerificationResult,
    extract_email_domain,
    is_free_email_domain,
    list_email_provider_presets,
    validate_email_domain_match,
    verify_email_and_smtp,
)
from app.domain.verification.helpers.dns_helpers import (
    build_dns_instructions,
    parse_dns_records_dict,
)
from app.domain.verification.helpers.domain_db_helpers import (
    build_email_verification_db_payloads,
    fetch_custom_esp_providers,
    fetch_existing_domain_record,
    persist_email_verification_payload,
    register_custom_esp_provider,
    resolve_stored_smtp_username,
    update_existing_domain_verification,
    upsert_initial_domain_verification,
)
from app.domain.verification.models import AddDomainVerificationResult
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import DOMAIN_VERIFICATION_TABLE, ESP_PROVIDERS_TABLE
from app.utils.helpers.domain_helpers import validate_main_mailbox_email
from app.utils.helpers.time_helpers import utc_now_iso

logger = logging.getLogger(__name__)


async def add_domain_to_verify(
    org_id: str,
    domain: str,
    user_email: str | None = None,
    smtp_username: str | None = None,
) -> dict[str, Any]:
    """Store or retrieve domain verification and return its DNS token."""
    clean_smtp_username = validate_main_mailbox_email(smtp_username) if smtp_username is not None else None

    if user_email:
        _, normalized_domain = validate_email_domain_match(user_email, domain)
    else:
        normalized_domain = normalize_domain(domain)
        if is_free_email_domain(normalized_domain):
            raise ValueError(f"Free email provider domains ({normalized_domain}) cannot be verified.")

    supabase_client = await get_supabase_client()
    existing_record = await fetch_existing_domain_record(supabase_client, org_id, DOMAIN_VERIFICATION_TABLE)
    existing_dns = parse_dns_records_dict(existing_record.get("dns_records") if existing_record else None)

    existing_token = existing_dns.get("value")
    has_existing_token = bool(existing_token and str(existing_token).strip())
    token = str(existing_token).strip() if has_existing_token else new_token()
    host = str(existing_dns.get("name") or _VERIFICATION_HOST) if has_existing_token else _VERIFICATION_HOST

    current_status = (existing_record.get("verification_status") if existing_record else "pending") or "pending"
    verified = current_status == "verified"

    if not verified and has_existing_token:
        try:
            if await is_verified(normalized_domain, token):
                current_status = "verified"
                verified = True
                await supabase_client.table(DOMAIN_VERIFICATION_TABLE).update(
                    {
                        "verification_status": "verified",
                        "verified_at": utc_now_iso(),
                        "domain": normalized_domain,
                    }
                ).eq("org_id", org_id).execute()
        except Exception:
            pass

    if not existing_record or not has_existing_token:
        await upsert_initial_domain_verification(
            supabase_client=supabase_client,
            org_id=org_id,
            normalized_domain=normalized_domain,
            host=host,
            token=token,
            existing_dns=existing_dns,
            clean_smtp_username=clean_smtp_username,
            table_name=DOMAIN_VERIFICATION_TABLE,
        )
    else:
        await update_existing_domain_verification(
            supabase_client=supabase_client,
            org_id=org_id,
            normalized_domain=normalized_domain,
            verified=verified,
            existing_record=existing_record,
            existing_dns=existing_dns,
            clean_smtp_username=clean_smtp_username,
            table_name=DOMAIN_VERIFICATION_TABLE,
        )

    stored_smtp_username = resolve_stored_smtp_username(clean_smtp_username, existing_record, existing_dns)
    result_payload = AddDomainVerificationResult(
        domain=normalized_domain,
        token=token,
        verification_status=current_status,
        verified=verified,
        dns_instructions=build_dns_instructions(token=token, host=host),
        smtp_username=stored_smtp_username,
    )
    return result_payload.to_dict(exclude_none=True)


async def domain_verification(org_id: str) -> bool:
    """Verify the organization's stored domain token through DNS."""
    supabase_client = await get_supabase_client()
    response = await (
        supabase_client
        .table(DOMAIN_VERIFICATION_TABLE)
        .select("domain, dns_records, verification_status")
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    record = response.data
    if not record or not record.get("domain") or not record.get("dns_records"):
        return False

    dns_records = parse_dns_records_dict(record["dns_records"])
    dns_val = dns_records.get("value")
    if not dns_val:
        return False

    verification_status = await is_verified(record["domain"], dns_val)
    update_data = (
        {"verification_status": "verified", "verified_at": utc_now_iso()}
        if verification_status
        else {"verification_status": "failed"}
    )
    await (
        supabase_client
        .table(DOMAIN_VERIFICATION_TABLE)
        .update(update_data)
        .eq("org_id", org_id)
        .eq("domain", record["domain"])
        .execute()
    )
    return verification_status


async def get_available_email_providers() -> list[dict[str, Any]]:
    """Return built-in ESP presets merged with any verified custom ESPs stored in DB."""
    presets = list_email_provider_presets()
    by_id: dict[str, dict[str, Any]] = {p["id"]: p for p in presets if p["id"] != "other"}
    other_item = next((p for p in presets if p["id"] == "other"), None)

    try:
        supabase_client = await get_supabase_client()
        custom_providers = await fetch_custom_esp_providers(supabase_client, ESP_PROVIDERS_TABLE)
        by_id.update(custom_providers)
    except Exception:
        pass

    result = list(by_id.values())
    if other_item:
        result.append(other_item)
    return result


async def verify_and_save_email_smtp(
    *,
    org_id: str,
    sender_email: str,
    user_email: str | None,
    email_provider: str,
    custom_email_provider: str | None = None,
    smtp_server: str,
    smtp_port: int,
    smtp_username: str | None = None,
    smtp_password: str | None = None,
    dkim_selector: str | None = None,
) -> EmailSmtpVerificationResult:
    """Verify the user's email & SMTP setup after domain verification is 'verified' and persist it."""
    if not email_provider or not email_provider.strip():
        raise ValueError("Please select your email provider before verifying your email.")

    if not smtp_password or not smtp_password.strip():
        raise ValueError("SMTP app password is required.")

    effective_email = (sender_email or user_email or "").strip().lower()
    if not effective_email:
        raise ValueError("Sender email address is required.")

    if user_email and effective_email != user_email.strip().lower():
        raise ValueError(
            f"The email to verify ('{effective_email}') must match your signed-in account email ('{user_email.strip().lower()}')."
        )

    supabase_client = await get_supabase_client()
    response = await (
        supabase_client
        .table(DOMAIN_VERIFICATION_TABLE)
        .select("*")
        .eq("org_id", org_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise ValueError("No domain verification record found. Please verify your domain first.")

    record = response.data[0]
    if record.get("verification_status") != "verified":
        if not await domain_verification(org_id):
            raise ValueError(
                "Your domain ownership must be 'verified' before email & SMTP verification can run."
            )

    existing_dns_records = parse_dns_records_dict(record.get("dns_records"))
    existing_smtp_config = (
        existing_dns_records.get("smtp_config")
        if isinstance(existing_dns_records.get("smtp_config"), dict)
        else {}
    )
    raw_smtp_username = (
        smtp_username
        or record.get("smtp_username")
        or existing_smtp_config.get("smtp_username")
        or ""
    )
    clean_smtp_username = validate_main_mailbox_email(raw_smtp_username)
    clean_smtp_password = smtp_password.strip()

    result = await verify_email_and_smtp(
        sender_email=effective_email,
        expected_domain=record.get("domain", ""),
        email_provider=email_provider,
        custom_email_provider=custom_email_provider,
        smtp_server=smtp_server,
        smtp_port=smtp_port,
        smtp_username=clean_smtp_username,
        smtp_password=clean_smtp_password,
        dkim_selector=dkim_selector,
    )

    updated_dns_records, full_update_payload = build_email_verification_db_payloads(
        result=result,
        existing_dns_records=existing_dns_records,
        clean_smtp_username=clean_smtp_username,
        clean_smtp_password=clean_smtp_password,
    )
    await persist_email_verification_payload(
        supabase_client=supabase_client,
        org_id=org_id,
        updated_dns_records=updated_dns_records,
        full_update_payload=full_update_payload,
        table_name=DOMAIN_VERIFICATION_TABLE,
    )
    await register_custom_esp_provider(
        supabase_client=supabase_client,
        result=result,
        esp_table=ESP_PROVIDERS_TABLE,
    )
    return result


__all__ = [
    "BUILTIN_ESP_ENUM_VALUES",
    "DOMAIN_VERIFICATION_TABLE",
    "ESP_PROVIDERS_TABLE",
    "EmailSmtpVerificationResult",
    "add_domain_to_verify",
    "domain_verification",
    "extract_email_domain",
    "get_available_email_providers",
    "is_free_email_domain",
    "is_verified",
    "list_email_provider_presets",
    "new_token",
    "normalize_domain",
    "validate_email_domain_match",
    "validate_main_mailbox_email",
    "verify_and_save_email_smtp",
    "verify_email_and_smtp",
]
