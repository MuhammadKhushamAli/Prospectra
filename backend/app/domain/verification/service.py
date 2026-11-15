"""Public operations for starting and completing domain and email/SMTP verification."""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
import json
import logging
import os
from typing import Any

from app.models.dns_record import DNSRecord
from app.models.domain_verification import DomainVerification
from app.services.supabase import get_supabase_client

from .dns import _VERIFICATION_HOST, is_verified, new_token, normalize_domain
from .email_verifier import (
    BUILTIN_ESP_ENUM_VALUES,
    EmailSmtpVerificationResult,
    extract_email_domain,
    is_free_email_domain,
    list_email_provider_presets,
    validate_email_domain_match,
    verify_email_and_smtp,
)

DOMAIN_VERIFICATION_TABLE = (
    os.environ.get("DOMAIN_VERIFICATION_TABLE")
    or os.environ.get("SUPABASE_DOMAIN_VERIFICATIONS_TABLE_NAME", "domain_verifications")
)
ESP_PROVIDERS_TABLE = os.environ.get("ESP_PROVIDERS_TABLE", "esp_providers")
logger = logging.getLogger(__name__)


def validate_main_mailbox_email(mailbox_email: str | None) -> str:
    """Validate and normalize the main mailbox email (stored as smtp_username in DB)."""
    if not mailbox_email or not mailbox_email.strip():
        raise ValueError("Main mailbox email (SMTP username) is required.")
    clean = mailbox_email.strip().lower()
    # Validate email syntax via extract_email_domain
    extract_email_domain(clean)
    return clean


async def add_domain_to_verify(
    org_id: str,
    domain: str,
    user_email: str | None = None,
    smtp_username: str | None = None,
) -> dict[str, Any]:
    """Store or retrieve domain verification and return its DNS token.

    Enforces that free email domains are rejected and, when ``user_email`` is
    provided, that ``domain`` matches the domain of the signed-in user's email.
    When ``smtp_username`` (main mailbox email) is provided, validates and persists
    it into ``smtp_username`` in the ``domain_verifications`` table.
    If a verification token already exists in DB for this organization,
    reuses the existing token from DB instead of generating a new one.
    """
    clean_smtp_username: str | None = None
    if smtp_username is not None:
        clean_smtp_username = validate_main_mailbox_email(smtp_username)

    if user_email:
        _, normalized_domain = validate_email_domain_match(user_email, domain)
    else:
        normalized_domain = normalize_domain(domain)
        if is_free_email_domain(normalized_domain):
            raise ValueError(
                f"Free email provider domains ({normalized_domain}) cannot be verified."
            )

    supabase_client = await get_supabase_client()

    # Query DB to check if a domain verification record already exists for this org
    existing_record: dict[str, Any] | None = None
    try:
        resp = await (
            supabase_client
            .table(DOMAIN_VERIFICATION_TABLE)
            .select("*")
            .eq("org_id", org_id)
            .limit(1)
            .execute()
        )
        if resp and resp.data:
            existing_record = dict(resp.data[0])
    except Exception as exc:
        logger.warning("Could not query existing domain verification for org %s: %s", org_id, exc)

    existing_dns = (
        existing_record.get("dns_records")
        if (existing_record and isinstance(existing_record.get("dns_records"), (dict, str)))
        else None
    )
    if isinstance(existing_dns, str):
        try:
            existing_dns = json.loads(existing_dns)
        except Exception:
            existing_dns = {}
    elif not isinstance(existing_dns, dict):
        existing_dns = {}

    existing_token = existing_dns.get("value")
    has_existing_token = bool(existing_token and str(existing_token).strip())

    # Reuse existing token from DB if present; otherwise generate a new token
    if has_existing_token:
        token = str(existing_token).strip()
        host = str(existing_dns.get("name") or _VERIFICATION_HOST)
    else:
        token = new_token()
        host = _VERIFICATION_HOST

    current_status = (
        existing_record.get("verification_status")
        if existing_record
        else "pending"
    ) or "pending"
    verified = current_status == "verified"

    # If domain already has a token in DB, run a live DNS check to see if it just propagated
    if not verified and has_existing_token:
        try:
            if await is_verified(normalized_domain, token):
                current_status = "verified"
                verified = True
                now_iso = datetime.now(timezone.utc).isoformat()
                await supabase_client.table(DOMAIN_VERIFICATION_TABLE).update({
                    "verification_status": "verified",
                    "verified_at": now_iso,
                    "domain": normalized_domain,
                }).eq("org_id", org_id).execute()
        except Exception:
            pass

    # If first time (no record or no token), create and persist the record
    if not existing_record or not has_existing_token:
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
            await supabase_client.table(DOMAIN_VERIFICATION_TABLE).upsert(
                row,
                on_conflict="org_id",
            ).execute()
        except Exception:
            row_fallback = dict(row)
            row_fallback.pop("smtp_username", None)
            try:
                await supabase_client.table(DOMAIN_VERIFICATION_TABLE).upsert(
                    row_fallback,
                    on_conflict="org_id",
                ).execute()
            except Exception:
                await supabase_client.table(DOMAIN_VERIFICATION_TABLE).upsert(
                    row_fallback,
                    on_conflict="org_id,domain",
                ).execute()
    else:
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
        if update_fields:
            try:
                await supabase_client.table(DOMAIN_VERIFICATION_TABLE).update(
                    update_fields
                ).eq("org_id", org_id).execute()
            except Exception:
                fallback_fields = dict(update_fields)
                fallback_fields.pop("smtp_username", None)
                if fallback_fields:
                    try:
                        await supabase_client.table(DOMAIN_VERIFICATION_TABLE).update(
                            fallback_fields
                        ).eq("org_id", org_id).execute()
                    except Exception:
                        pass

    stored_smtp_username = (
        clean_smtp_username
        or (existing_record.get("smtp_username") if existing_record else None)
        or (
            existing_dns.get("smtp_config", {}).get("smtp_username")
            if isinstance(existing_dns.get("smtp_config"), dict)
            else None
        )
    )

    result_payload: dict[str, Any] = {
        "domain": normalized_domain,
        "token": token,
        "verification_status": current_status,
        "verified": verified,
        "dns_instructions": {
            "title": "Add this DNS record to your domain provider:",
            "type": "TXT",
            "host": host,
            "value": token,
        },
    }
    if stored_smtp_username:
        result_payload["smtp_username"] = stored_smtp_username
    return result_payload


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

    dns_records = record["dns_records"] if isinstance(record["dns_records"], dict) else {}
    dns_val = dns_records.get("value")
    if not dns_val:
        return False

    verification_status = await is_verified(record["domain"], dns_val)
    now_iso = datetime.now(timezone.utc).isoformat()

    if verification_status:
        await supabase_client.table(DOMAIN_VERIFICATION_TABLE).update(
            {
                "verification_status": "verified",
                "verified_at": now_iso,
            }
        ).eq("org_id", org_id).eq("domain", record["domain"]).execute()
    else:
        await supabase_client.table(DOMAIN_VERIFICATION_TABLE).update(
            {"verification_status": "failed"}
        ).eq("org_id", org_id).eq("domain", record["domain"]).execute()

    return verification_status


async def get_available_email_providers() -> list[dict[str, Any]]:
    """Return built-in ESP presets merged with any verified custom ESPs stored in DB."""
    presets = list_email_provider_presets()
    by_id: dict[str, dict[str, Any]] = {
        p["id"]: p for p in presets if p["id"] != "other"
    }
    other_item = next((p for p in presets if p["id"] == "other"), None)

    try:
        supabase_client = await get_supabase_client()
        resp = await supabase_client.table(ESP_PROVIDERS_TABLE).select("*").execute()
        for row in resp.data or []:
            pid = str(row.get("id") or "").strip().lower()
            if not pid or pid == "other":
                continue
            by_id[pid] = {
                "id": pid,
                "label": row.get("label") or pid,
                "smtp_server": row.get("smtp_server") or "",
                "smtp_port": int(row.get("smtp_port") or 587),
                "smtp_used": row.get("smtp_used") or "STARTTLS",
                "default_dkim_selectors": list(row.get("default_dkim_selectors") or ["default"]),
                "is_custom": bool(row.get("is_custom")),
            }
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
    domain_status = record.get("verification_status")
    if domain_status != "verified":
        # Attempt a live DNS check in case DNS just propagated
        just_verified = await domain_verification(org_id)
        if not just_verified:
            raise ValueError(
                "Your domain ownership must be 'verified' before email & SMTP verification can run."
            )

    existing_dns_records = record.get("dns_records") if isinstance(record.get("dns_records"), dict) else {}
    existing_smtp_config = existing_dns_records.get("smtp_config") if isinstance(existing_dns_records.get("smtp_config"), dict) else {}
    raw_smtp_username = (
        smtp_username
        or record.get("smtp_username")
        or existing_smtp_config.get("smtp_username")
        or ""
    )
    clean_smtp_username = validate_main_mailbox_email(raw_smtp_username)
    clean_smtp_password = smtp_password.strip()

    verified_domain = record.get("domain", "")
    result = await verify_email_and_smtp(
        sender_email=effective_email,
        expected_domain=verified_domain,
        email_provider=email_provider,
        custom_email_provider=custom_email_provider,
        smtp_server=smtp_server,
        smtp_port=smtp_port,
        smtp_username=clean_smtp_username,
        smtp_password=clean_smtp_password,
        dkim_selector=dkim_selector,
    )

    now_iso = datetime.now(timezone.utc).isoformat() if result.verified else None
    enum_esp_provider = (
        result.email_provider
        if result.email_provider in BUILTIN_ESP_ENUM_VALUES
        else "other"
    )
    stored_provider_value = result.email_provider_label or result.email_provider
    updated_dns_records = {
        **existing_dns_records,
        "smtp_config": {
            "sender_email": result.sender_email,
            "esp_provider": enum_esp_provider,
            "email_provider": stored_provider_value,
            "email_provider_id": result.email_provider,
            "is_custom_provider": result.is_custom_provider,
            "smtp_used": result.smtp_used,
            "smtp_server": result.smtp_server,
            "smtp_port": result.smtp_port,
            "smtp_username": clean_smtp_username,
            "smtp_password": clean_smtp_password,
            "dkim_selector": result.dkim_selector,
        },
        "email_verification": {
            "status": result.verification_status,
            "verified": result.verified,
            "verified_at": now_iso,
            "smtp_used": result.smtp_used,
            "authentication_results_header": result.authentication_results_header,
            "mx_valid": result.mx_valid,
            "mx_records": result.mx_records,
            "spf_valid": result.spf_valid,
            "spf_record": result.spf_record,
            "spf_result": result.spf_result,
            "dmarc_valid": result.dmarc_valid,
            "dmarc_record": result.dmarc_record,
            "dmarc_policy": result.dmarc_policy,
            "dkim_valid": result.dkim_valid,
            "dkim_selector": result.dkim_selector,
            "smtp_reachable": result.smtp_reachable,
            "smtp_authenticated": result.smtp_authenticated,
            "smtp_banner": result.smtp_banner,
            "warnings": result.warnings,
            "errors": result.errors,
        },
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

    try:
        await (
            supabase_client
            .table(DOMAIN_VERIFICATION_TABLE)
            .update(full_update_payload)
            .eq("org_id", org_id)
            .execute()
        )
    except Exception:
        # Fallback if dedicated columns have not been migrated via db reset yet
        await (
            supabase_client
            .table(DOMAIN_VERIFICATION_TABLE)
            .update({"dns_records": updated_dns_records})
            .eq("org_id", org_id)
            .execute()
        )

    # Register newly entered "Other" ESP in esp_providers table once domain & email verification succeed
    if result.verified and result.is_custom_provider:
        try:
            await (
                supabase_client
                .table(ESP_PROVIDERS_TABLE)
                .upsert(
                    {
                        "id": result.email_provider,
                        "label": result.email_provider_label or result.email_provider,
                        "smtp_server": result.smtp_server,
                        "smtp_port": result.smtp_port,
                        "smtp_used": result.smtp_used,
                        "default_dkim_selectors": [result.dkim_selector or "default"],
                        "is_custom": True,
                    },
                    on_conflict="id",
                )
                .execute()
            )
        except Exception:
            pass

    return result

