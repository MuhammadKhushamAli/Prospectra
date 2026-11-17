"""Industry-standard Email, DNS (MX/SPF/DKIM/DMARC), AuthRes, and SMTP verification service."""

from __future__ import annotations

import asyncio
from dataclasses import asdict, dataclass, field
import logging
from typing import Any

from app.domain.verification.dns import normalize_domain, resolver
from app.domain.verification.helpers.authres_helpers import _build_authres_header
from app.domain.verification.helpers.dkim_helpers import _check_dkim_with_dkimpy
from app.domain.verification.helpers.mx_helpers import _check_mx_with_dnspython
from app.domain.verification.helpers.smtp_probe_helpers import (
    _infer_protocol_for_port,
    _verify_smtp_connection_sync,
    build_dns_audit_warnings,
    resolve_provider_preset,
    validate_smtp_input_parameters,
)
from app.domain.verification.helpers.spf_dmarc_helpers import (
    _check_spf_and_dmarc_with_checkdmarc_and_pyspf,
)
from app.utils.constants.dns_constants import FREE_EMAIL_DOMAINS
from app.utils.constants.email_constants import (
    BUILTIN_ESP_ENUM_VALUES,
    EMAIL_PROVIDER_PRESETS,
    EmailProviderPreset,
    VALID_SMTP_SECURITY_MODES,
)
from app.utils.helpers.domain_helpers import (
    extract_email_domain,
    is_free_email_domain,
    normalize_provider_slug,
    validate_email_domain_match,
)

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class EmailSmtpVerificationResult:
    """Comprehensive verification outcome for a sender email, domain DNS, and SMTP setup."""

    verified: bool
    verification_status: str  # "verified" | "failed"
    sender_email: str
    domain: str
    email_provider: str
    smtp_used: str
    smtp_server: str
    smtp_port: int
    dkim_selector: str | None
    authentication_results_header: str
    mx_valid: bool
    email_provider_label: str = ""
    is_custom_provider: bool = False
    mx_records: list[str] = field(default_factory=list)
    spf_valid: bool = False
    spf_record: str | None = None
    spf_result: str = "none"
    dmarc_valid: bool = False
    dmarc_record: str | None = None
    dmarc_policy: str | None = None
    dkim_valid: bool = False
    dkim_record: str | None = None
    smtp_reachable: bool = False
    smtp_authenticated: bool | None = None
    smtp_banner: str | None = None
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def list_email_provider_presets() -> list[dict[str, Any]]:
    """Return serializable list of supported email providers and their default SMTP settings."""
    return [
        {
            "id": preset.id,
            "label": preset.label,
            "smtp_server": preset.smtp_server,
            "smtp_port": preset.smtp_port,
            "smtp_used": preset.smtp_used,
            "default_dkim_selectors": list(preset.default_dkim_selectors),
        }
        for preset in EMAIL_PROVIDER_PRESETS.values()
    ]


async def verify_email_and_smtp(
    *,
    sender_email: str,
    expected_domain: str,
    email_provider: str,
    custom_email_provider: str | None = None,
    smtp_server: str | None = None,
    smtp_port: int | None = None,
    smtp_username: str | None = None,
    smtp_password: str | None = None,
    dkim_selector: str | None = None,
) -> EmailSmtpVerificationResult:
    """Execute full email & SMTP verification, automatically selecting the SMTP security protocol."""
    clean_email, normalized_domain = validate_email_domain_match(sender_email, expected_domain)
    provider_key, provider_display, is_custom_provider, preset = resolve_provider_preset(
        email_provider,
        custom_email_provider,
    )

    resolved_smtp_server = (smtp_server or preset.smtp_server).strip().lower()
    resolved_smtp_port = int(smtp_port if smtp_port is not None else preset.smtp_port)

    logger.info(
        "[EMAIL VERIFIER] Starting verification for %s on domain %s (provider=%s, server=%s:%s)",
        clean_email,
        normalized_domain,
        provider_display,
        resolved_smtp_server,
        resolved_smtp_port,
    )

    errors = validate_smtp_input_parameters(
        resolved_smtp_server=resolved_smtp_server,
        resolved_smtp_port=resolved_smtp_port,
        smtp_username=smtp_username,
        smtp_password=smtp_password,
    )
    warnings: list[str] = []

    mx_task = _check_mx_with_dnspython(normalized_domain)
    spf_dmarc_task = asyncio.to_thread(
        _check_spf_and_dmarc_with_checkdmarc_and_pyspf,
        normalized_domain,
        clean_email,
        resolved_smtp_server,
    )
    dkim_task = _check_dkim_with_dkimpy(
        normalized_domain,
        dkim_selector,
        preset.default_dkim_selectors,
    )
    smtp_task = asyncio.to_thread(
        _verify_smtp_connection_sync,
        resolved_smtp_server,
        resolved_smtp_port,
        preset.smtp_used,
        (smtp_username or "").strip() or None,
        (smtp_password or "").strip() or None,
    )

    (
        (mx_valid, mx_records, mx_warnings),
        spf_dmarc_res,
        (dkim_valid, matched_selector, dkim_record, dkim_warnings),
        smtp_res,
    ) = await asyncio.gather(mx_task, spf_dmarc_task, dkim_task, smtp_task)

    resolved_smtp_used = str(
        smtp_res.get("smtp_used") or _infer_protocol_for_port(resolved_smtp_port, preset.smtp_used)
    )

    warnings.extend(mx_warnings)
    warnings.extend(spf_dmarc_res.get("warnings", []))
    warnings.extend(dkim_warnings)

    spf_valid = bool(spf_dmarc_res.get("spf_valid"))
    spf_record = spf_dmarc_res.get("spf_record")
    spf_result = str(spf_dmarc_res.get("spf_result") or ("pass" if spf_valid else "none"))
    dmarc_valid = bool(spf_dmarc_res.get("dmarc_valid"))
    dmarc_record = spf_dmarc_res.get("dmarc_record")
    dmarc_policy = spf_dmarc_res.get("dmarc_policy")

    smtp_reachable = bool(smtp_res.get("reachable"))
    smtp_authenticated = smtp_res.get("authenticated")
    smtp_banner = smtp_res.get("banner")
    if smtp_res.get("error"):
        errors.append(str(smtp_res["error"]))

    warnings.extend(
        build_dns_audit_warnings(
            normalized_domain=normalized_domain,
            provider_display=provider_display,
            mx_valid=mx_valid,
            spf_valid=spf_valid,
            dmarc_valid=dmarc_valid,
            dkim_valid=dkim_valid,
            default_dkim_selectors=preset.default_dkim_selectors,
        )
    )

    authres_header = _build_authres_header(
        authserv_id=normalized_domain,
        sender_email=clean_email,
        domain=normalized_domain,
        spf_result="pass" if spf_valid else spf_result,
        dkim_valid=dkim_valid,
        dkim_selector=matched_selector,
        dmarc_valid=dmarc_valid,
    )

    is_verified = (
        not errors
        and smtp_reachable
        and smtp_authenticated is not False
    )

    logger.info(
        "[EMAIL VERIFIER] Completed verification for %s: verified=%s, status=%s, smtp_used=%s, mx=%s, spf=%s, dkim=%s, dmarc=%s, errors=%s",
        clean_email,
        is_verified,
        "verified" if is_verified else "failed",
        resolved_smtp_used,
        mx_valid,
        spf_valid,
        dkim_valid,
        dmarc_valid,
        errors or [],
    )

    return EmailSmtpVerificationResult(
        verified=is_verified,
        verification_status="verified" if is_verified else "failed",
        sender_email=clean_email,
        domain=normalized_domain,
        email_provider=provider_key,
        email_provider_label=provider_display,
        is_custom_provider=is_custom_provider,
        smtp_used=resolved_smtp_used,
        smtp_server=resolved_smtp_server,
        smtp_port=resolved_smtp_port,
        dkim_selector=matched_selector,
        authentication_results_header=authres_header,
        mx_valid=mx_valid,
        mx_records=mx_records,
        spf_valid=spf_valid,
        spf_record=spf_record,
        spf_result=spf_result,
        dmarc_valid=dmarc_valid,
        dmarc_record=dmarc_record,
        dmarc_policy=dmarc_policy,
        dkim_valid=dkim_valid,
        dkim_record=dkim_record,
        smtp_reachable=smtp_reachable,
        smtp_authenticated=smtp_authenticated,
        smtp_banner=smtp_banner,
        warnings=warnings,
        errors=errors,
    )


__all__ = [
    "BUILTIN_ESP_ENUM_VALUES",
    "EMAIL_PROVIDER_PRESETS",
    "EmailProviderPreset",
    "EmailSmtpVerificationResult",
    "FREE_EMAIL_DOMAINS",
    "VALID_SMTP_SECURITY_MODES",
    "_build_authres_header",
    "_check_dkim_with_dkimpy",
    "_check_mx_with_dnspython",
    "_check_spf_and_dmarc_with_checkdmarc_and_pyspf",
    "_infer_protocol_for_port",
    "_verify_smtp_connection_sync",
    "extract_email_domain",
    "is_free_email_domain",
    "list_email_provider_presets",
    "normalize_domain",
    "normalize_provider_slug",
    "resolver",
    "validate_email_domain_match",
    "verify_email_and_smtp",
]
