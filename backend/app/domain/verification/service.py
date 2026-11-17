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
    logger.info(
        "[DOMAIN] add_domain_to_verify: org_id=%s, domain=%s, user_email=%s, smtp_username=%s",
        org_id,
        domain,
        user_email,
        smtp_username,
    )
    clean_smtp_username = validate_main_mailbox_email(smtp_username) if smtp_username is not None else None

    if user_email:
        _, normalized_domain = validate_email_domain_match(user_email, domain)
    else:
        normalized_domain = normalize_domain(domain)
        if is_free_email_domain(normalized_domain):
            logger.warning("[DOMAIN] Blocked free email domain verification attempt: %s", normalized_domain)
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
            logger.info("[DOMAIN] Checking DNS TXT token for domain %s (token=%s)...", normalized_domain, token)
            if await is_verified(normalized_domain, token):
                current_status = "verified"
                verified = True
                logger.info("[DOMAIN] Domain %s verified via DNS TXT record for org_id=%s", normalized_domain, org_id)
                await supabase_client.table(DOMAIN_VERIFICATION_TABLE).update(
                    {
                        "verification_status": "verified",
                        "verified_at": utc_now_iso(),
                        "domain": normalized_domain,
                    }
                ).eq("org_id", org_id).execute()
        except Exception as exc:
            logger.warning("[DOMAIN] DNS check error during add_domain_to_verify for %s: %s", normalized_domain, exc)

    if not existing_record or not has_existing_token:
        logger.info("[DOMAIN] Upserting initial domain verification: org_id=%s, domain=%s, token=%s", org_id, normalized_domain, token)
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
        logger.info("[DOMAIN] Updating existing domain verification record: org_id=%s, domain=%s, status=%s", org_id, normalized_domain, current_status)
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
    logger.info("[DOMAIN] add_domain_to_verify returning: domain=%s, status=%s, verified=%s", normalized_domain, current_status, verified)
    return result_payload.to_dict(exclude_none=True)


async def domain_verification(org_id: str) -> bool:
    """Verify the organization's stored domain token through DNS."""
    logger.info("[DOMAIN] Running domain_verification for org_id=%s", org_id)
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
        logger.warning("[DOMAIN] No domain verification record found for org_id=%s", org_id)
        return False

    dns_records = parse_dns_records_dict(record["dns_records"])
    dns_val = dns_records.get("value")
    if not dns_val:
        logger.warning("[DOMAIN] No DNS token in record for org_id=%s, domain=%s", org_id, record.get("domain"))
        return False

    logger.info("[DOMAIN] Probing DNS TXT record for %s (token=%s)", record["domain"], dns_val)
    verification_status = await is_verified(record["domain"], dns_val)
    logger.info(
        "[DOMAIN] DNS verification outcome for %s: %s",
        record["domain"],
        "VERIFIED" if verification_status else "FAILED",
    )
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
    logger.info("[DOMAIN] Updated domain %s verification_status to '%s' in DB (org_id=%s)", record["domain"], update_data["verification_status"], org_id)
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

    logger.info(
        "[EMAIL] verify_and_save_email_smtp initiated: org_id=%s, sender=%s, provider=%s, smtp_server=%s:%s",
        org_id,
        effective_email,
        email_provider,
        smtp_server,
        smtp_port,
    )

    if user_email and effective_email != user_email.strip().lower():
        logger.warning(
            "[EMAIL] Mismatch between verify email (%s) and sign-in email (%s)",
            effective_email,
            user_email,
        )
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
        logger.warning("[EMAIL] No domain verification record found for org_id=%s", org_id)
        raise ValueError("No domain verification record found. Please verify your domain first.")

    record = response.data[0]
    if record.get("verification_status") != "verified":
        logger.info("[EMAIL] Domain verification status is '%s', checking DNS for org_id=%s...", record.get("verification_status"), org_id)
        if not await domain_verification(org_id):
            logger.warning("[EMAIL] Domain verification prerequisite failed for org_id=%s", org_id)
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

    logger.info("[EMAIL] Running verify_email_and_smtp for %s on domain %s...", effective_email, record.get("domain", ""))
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
    logger.info(
        "[EMAIL] Result for %s: verified=%s, status=%s, smtp_used=%s",
        effective_email,
        result.verified,
        result.verification_status,
        result.smtp_used,
    )

    updated_dns_records, full_update_payload = build_email_verification_db_payloads(
        result=result,
        existing_dns_records=existing_dns_records,
        clean_smtp_username=clean_smtp_username,
        clean_smtp_password=clean_smtp_password,
    )
    logger.info("[EMAIL] Persisting email verification results into database for org_id=%s...", org_id)
    await persist_email_verification_payload(
        supabase_client=supabase_client,
        org_id=org_id,
        updated_dns_records=updated_dns_records,
        full_update_payload=full_update_payload,
        table_name=DOMAIN_VERIFICATION_TABLE,
    )
    logger.info("[EMAIL] Successfully persisted email verification payload for org_id=%s", org_id)
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
