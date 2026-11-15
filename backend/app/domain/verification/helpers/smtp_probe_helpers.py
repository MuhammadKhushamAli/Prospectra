"""SMTP connection probing, protocol negotiation, and provider preset resolution helpers."""

from __future__ import annotations

import smtplib
import socket
import ssl
from typing import Any

from app.domain.verification.models import SmtpConnectionProbeResult
from app.utils.constants.email_constants import (
    BUILTIN_ESP_ENUM_VALUES,
    EMAIL_PROVIDER_PRESETS,
    EmailProviderPreset,
    VALID_SMTP_SECURITY_MODES,
)
from app.utils.helpers.domain_helpers import extract_email_domain, normalize_provider_slug


def _infer_protocol_for_port(smtp_port: int, default_protocol: str = "STARTTLS") -> str:
    """Choose the standard SMTP security protocol when live capability probing is blocked."""
    if smtp_port == 465:
        return "SSL/TLS"
    if smtp_port in (587, 2525):
        return "STARTTLS"
    return default_protocol if default_protocol in VALID_SMTP_SECURITY_MODES else "STARTTLS"


def resolve_smtp_host_dns(host: str, smtp_port: int) -> tuple[bool, str | None]:
    """Check whether the SMTP server hostname resolves in DNS."""
    try:
        resolved_ips = socket.getaddrinfo(host, smtp_port, type=socket.SOCK_STREAM)
        return bool(resolved_ips), None
    except socket.gaierror as exc:
        return False, f"SMTP server '{host}' could not be resolved in DNS ({exc})."


def probe_smtp_ssl_connection(
    host: str,
    smtp_port: int,
    dns_resolved: bool,
    context: ssl.SSLContext,
    smtp_username: str | None = None,
    smtp_password: str | None = None,
    timeout: float = 6.0,
) -> dict[str, Any]:
    """Probe an implicit SSL/TLS SMTP server connection and optional login via SmtpConnectionProbeResult."""
    try:
        with smtplib.SMTP_SSL(host=host, port=smtp_port, timeout=timeout, context=context) as server:
            code, msg = server.ehlo()
            banner = msg.decode("utf-8", errors="ignore").splitlines()[0] if msg else str(code)
            authenticated: bool | None = None
            if smtp_username and smtp_password:
                server.login(smtp_username.strip(), smtp_password)
                authenticated = True
            return SmtpConnectionProbeResult(
                reachable=True,
                dns_resolved=dns_resolved,
                smtp_used="SSL/TLS",
                authenticated=authenticated,
                banner=banner,
                error=None,
            ).to_dict()
    except smtplib.SMTPAuthenticationError as exc:
        return SmtpConnectionProbeResult(
            reachable=True,
            dns_resolved=dns_resolved,
            smtp_used="SSL/TLS",
            authenticated=False,
            banner=None,
            error=f"SMTP authentication failed (SMTP {exc.smtp_code}): check your SMTP username or app password.",
        ).to_dict()
    except (OSError, smtplib.SMTPException) as exc:
        return SmtpConnectionProbeResult(
            reachable=dns_resolved,
            dns_resolved=dns_resolved,
            smtp_used="SSL/TLS",
            authenticated=None,
            banner=f"DNS resolved ({host}:{smtp_port}); SSL/TLS auto-selected ({exc.__class__.__name__})",
            error=None,
            fallback_needed=True,
        ).to_dict()


def probe_smtp_starttls_or_plain_connection(
    host: str,
    smtp_port: int,
    inferred_protocol: str,
    dns_resolved: bool,
    context: ssl.SSLContext,
    smtp_username: str | None = None,
    smtp_password: str | None = None,
) -> dict[str, Any]:
    """Probe a non-465 SMTP port for STARTTLS or PLAIN, with implicit SSL fallback."""
    detected_protocol = inferred_protocol
    try:
        with smtplib.SMTP(host=host, port=smtp_port, timeout=6.0) as server:
            code, msg = server.ehlo()
            banner = msg.decode("utf-8", errors="ignore").splitlines()[0] if msg else str(code)
            if server.has_extn("starttls"):
                server.starttls(context=context)
                server.ehlo()
                detected_protocol = "STARTTLS"
            else:
                detected_protocol = "PLAIN"
            authenticated = None
            if smtp_username and smtp_password:
                server.login(smtp_username.strip(), smtp_password)
                authenticated = True
            return SmtpConnectionProbeResult(
                reachable=True,
                dns_resolved=dns_resolved,
                smtp_used=detected_protocol,
                authenticated=authenticated,
                banner=banner,
                error=None,
            ).to_dict()
    except smtplib.SMTPAuthenticationError as exc:
        return SmtpConnectionProbeResult(
            reachable=True,
            dns_resolved=dns_resolved,
            smtp_used=detected_protocol,
            authenticated=False,
            banner=None,
            error=f"SMTP authentication failed (SMTP {exc.smtp_code}): check your SMTP username or app password.",
        ).to_dict()
    except (OSError, smtplib.SMTPException) as exc:
        ssl_res = probe_smtp_ssl_connection(
            host=host,
            smtp_port=smtp_port,
            dns_resolved=dns_resolved,
            context=context,
            smtp_username=smtp_username,
            smtp_password=smtp_password,
            timeout=4.0,
        )
        if not ssl_res.get("fallback_needed"):
            ssl_res.pop("fallback_needed", None)
            return ssl_res

        probe = SmtpConnectionProbeResult(
            reachable=dns_resolved,
            dns_resolved=dns_resolved,
            smtp_used=inferred_protocol,
            authenticated=None,
            banner=f"DNS resolved ({host}:{smtp_port}); {inferred_protocol} auto-selected ({exc.__class__.__name__})",
            error=None,
        ).to_dict()
        probe.pop("fallback_needed", None)
        return probe


def _verify_smtp_connection_sync(
    smtp_server: str,
    smtp_port: int,
    default_security: str = "STARTTLS",
    smtp_username: str | None = None,
    smtp_password: str | None = None,
) -> dict[str, Any]:
    """Verify SMTP server DNS resolution, auto-detect security protocol, and test login."""
    inferred_protocol = _infer_protocol_for_port(smtp_port, default_security)
    if not smtp_server or not smtp_server.strip():
        res = SmtpConnectionProbeResult(
            reachable=False,
            dns_resolved=False,
            smtp_used=inferred_protocol,
            authenticated=None,
            banner=None,
            error="SMTP server hostname is required.",
        ).to_dict()
        res.pop("fallback_needed", None)
        return res

    host = smtp_server.strip()
    dns_resolved, dns_err = resolve_smtp_host_dns(host, smtp_port)
    if not dns_resolved:
        res = SmtpConnectionProbeResult(
            reachable=False,
            dns_resolved=False,
            smtp_used=inferred_protocol,
            authenticated=None,
            banner=None,
            error=dns_err,
        ).to_dict()
        res.pop("fallback_needed", None)
        return res

    context = ssl.create_default_context()
    if smtp_port == 465:
        res = probe_smtp_ssl_connection(
            host=host,
            smtp_port=smtp_port,
            dns_resolved=dns_resolved,
            context=context,
            smtp_username=smtp_username,
            smtp_password=smtp_password,
        )
        res.pop("fallback_needed", None)
        return res

    res = probe_smtp_starttls_or_plain_connection(
        host=host,
        smtp_port=smtp_port,
        inferred_protocol=inferred_protocol,
        dns_resolved=dns_resolved,
        context=context,
        smtp_username=smtp_username,
        smtp_password=smtp_password,
    )
    res.pop("fallback_needed", None)
    return res


def resolve_provider_preset(
    email_provider: str,
    custom_email_provider: str | None = None,
) -> tuple[str, str, bool, EmailProviderPreset]:
    """Resolve provider key, display label, custom flag, and EmailProviderPreset."""
    raw_provider = (email_provider or "").strip()
    provider_lower = raw_provider.lower()
    if provider_lower in ("other", "custom_smtp"):
        custom_name = (custom_email_provider or "").strip()
        if not custom_name or len(custom_name) < 2:
            raise ValueError("Please enter your custom email provider name.")
        provider_key = normalize_provider_slug(custom_name)
        preset = EMAIL_PROVIDER_PRESETS["other"]
        provider_display = custom_name
        is_custom_provider = provider_key not in BUILTIN_ESP_ENUM_VALUES
        return provider_key, provider_display, is_custom_provider, preset

    preset = EMAIL_PROVIDER_PRESETS.get(provider_lower)
    if not preset:
        preset = EMAIL_PROVIDER_PRESETS["other"]
        provider_key = normalize_provider_slug(raw_provider)
        provider_display = (custom_email_provider or raw_provider or "Custom").strip()
        is_custom_provider = provider_key not in BUILTIN_ESP_ENUM_VALUES
        return provider_key, provider_display, is_custom_provider, preset

    return preset.id, preset.label, False, preset


def validate_smtp_input_parameters(
    resolved_smtp_server: str,
    resolved_smtp_port: int,
    smtp_username: str | None,
    smtp_password: str | None,
) -> list[str]:
    """Validate SMTP host, port, username, and app password inputs."""
    errors: list[str] = []
    if not resolved_smtp_server:
        errors.append("SMTP server host is required.")
    if not (1 <= resolved_smtp_port <= 65535):
        errors.append("SMTP port must be between 1 and 65535.")
    if not smtp_username or not smtp_username.strip():
        errors.append("Main mailbox email (SMTP username) is required.")
    else:
        try:
            extract_email_domain(smtp_username.strip())
        except ValueError:
            errors.append("Enter a valid main mailbox email address (SMTP username).")
    if not smtp_password or not smtp_password.strip():
        errors.append("SMTP app password is required.")
    return errors


def build_dns_audit_warnings(
    normalized_domain: str,
    provider_display: str,
    mx_valid: bool,
    spf_valid: bool,
    dmarc_valid: bool,
    dkim_valid: bool,
    default_dkim_selectors: tuple[str, ...],
) -> list[str]:
    """Generate non-blocking DNS deliverability warnings for missing MX/SPF/DMARC/DKIM."""
    warnings: list[str] = []
    if not mx_valid:
        warnings.append(
            f"No MX records were found for '{normalized_domain}'. Add MX records for your provider ({provider_display}) to receive replies."
        )
    if not spf_valid:
        warnings.append(
            f"No SPF record (v=spf1) detected on '{normalized_domain}'. Adding an SPF TXT record improves inbox placement."
        )
    if not dmarc_valid:
        warnings.append(
            f"No DMARC record (v=DMARC1) detected at '_dmarc.{normalized_domain}'."
        )
    if not dkim_valid:
        warnings.append(
            f"No public DKIM key detected for selectors {list(default_dkim_selectors)}."
        )
    return warnings
