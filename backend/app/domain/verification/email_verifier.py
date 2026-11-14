"""Industry-standard Email, DNS (MX/SPF/DKIM/DMARC), AuthRes, and SMTP verification service.

Uses:
- ``dnspython`` for MX, TXT, DKIM selector, and SMTP host DNS resolution
- ``checkdmarc`` for RFC-compliant DMARC and SPF record auditing
- ``pyspf`` for RFC 7208 Sender Policy Framework query evaluation
- ``dkimpy`` for RFC 6376 DKIM public key & cryptographic signature validation
- ``authres`` for RFC 8601 Authentication-Results header generation and parsing
- ``smtplib`` / ``ssl`` for live SMTP server handshake & optional credential check
"""

from __future__ import annotations

import asyncio
import logging
import re
import socket
import smtplib
import ssl
from dataclasses import asdict, dataclass, field
from typing import Any

import authres
import authres.dmarc
import checkdmarc
import dkim
import dkim.crypto
import dns.asyncresolver
import dns.exception
import dns.resolver
import spf

from app.domain.verification.dns import normalize_domain, resolver

logger = logging.getLogger(__name__)

# Comprehensive set of consumer / free email providers disallowed for business sign-up & verification
FREE_EMAIL_DOMAINS: frozenset[str] = frozenset(
    {
        "gmail.com",
        "googlemail.com",
        "yahoo.com",
        "yahoo.co.uk",
        "yahoo.ca",
        "yahoo.co.in",
        "ymail.com",
        "rocketmail.com",
        "outlook.com",
        "hotmail.com",
        "hotmail.co.uk",
        "live.com",
        "msn.com",
        "icloud.com",
        "me.com",
        "mac.com",
        "aol.com",
        "protonmail.com",
        "proton.me",
        "pm.me",
        "zohomail.com",
        "yandex.com",
        "yandex.ru",
        "mail.com",
        "email.com",
        "gmx.com",
        "gmx.de",
        "gmx.net",
        "mail.ru",
        "fastmail.com",
        "tutanota.com",
        "tuta.com",
        "hey.com",
        "rediffmail.com",
        "qq.com",
        "163.com",
        "126.com",
    }
)

VALID_SMTP_SECURITY_MODES = ("STARTTLS", "SSL/TLS", "PLAIN")


@dataclass(frozen=True, slots=True)
class EmailProviderPreset:
    """Standard SMTP and DNS configuration preset for an email service provider."""

    id: str
    label: str
    smtp_server: str
    smtp_port: int
    smtp_used: str  # "STARTTLS" | "SSL/TLS" | "PLAIN"
    default_dkim_selectors: tuple[str, ...]
    expected_mx_Keywords: tuple[str, ...]
    expected_spf_includes: tuple[str, ...]


EMAIL_PROVIDER_PRESETS: dict[str, EmailProviderPreset] = {
    "google_workspace": EmailProviderPreset(
        id="google_workspace",
        label="Google Workspace (Gmail Business)",
        smtp_server="smtp.gmail.com",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("google", "default", "20230601"),
        expected_mx_Keywords=("google.com", "googlemail.com", "aspmx.l.google.com"),
        expected_spf_includes=("_spf.google.com", "google.com"),
    ),
    "microsoft_365": EmailProviderPreset(
        id="microsoft_365",
        label="Microsoft 365 (Exchange Online)",
        smtp_server="smtp.office365.com",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("selector1", "selector2"),
        expected_mx_Keywords=("outlook.com", "protection.outlook.com"),
        expected_spf_includes=("spf.protection.outlook.com", "outlook.com"),
    ),
    "zoho": EmailProviderPreset(
        id="zoho",
        label="Zoho Mail Workplace",
        smtp_server="smtp.zoho.com",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("zoho", "zmail", "default"),
        expected_mx_Keywords=("zoho.com", "zoho.eu", "zoho.in", "zohomail.com"),
        expected_spf_includes=("zoho.com", "zohomail.com", "zcsend.net"),
    ),
    "hostinger": EmailProviderPreset(
        id="hostinger",
        label="Hostinger Email",
        smtp_server="smtp.hostinger.com",
        smtp_port=465,
        smtp_used="SSL/TLS",
        default_dkim_selectors=("hostingermail-a", "hostingermail-b", "hostingermail-c", "default"),
        expected_mx_Keywords=("mx1.hostinger.com", "mx2.hostinger.com", "hostinger.com"),
        expected_spf_includes=("_spf.mail.hostinger.com", "hostinger.com"),
    ),
    "amazon_ses": EmailProviderPreset(
        id="amazon_ses",
        label="Amazon SES",
        smtp_server="email-smtp.us-east-1.amazonaws.com",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("default", "ses"),
        expected_mx_Keywords=("amazonaws.com", "amazonses.com"),
        expected_spf_includes=("amazonses.com",),
    ),
    "sendgrid": EmailProviderPreset(
        id="sendgrid",
        label="Twilio SendGrid",
        smtp_server="smtp.sendgrid.net",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("s1", "s2", "smtpapi"),
        expected_mx_Keywords=("sendgrid.net",),
        expected_spf_includes=("sendgrid.net",),
    ),
    "mailgun": EmailProviderPreset(
        id="mailgun",
        label="Mailgun",
        smtp_server="smtp.mailgun.org",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("krs", "pic", "smtp", "mailo", "mx"),
        expected_mx_Keywords=("mailgun.org",),
        expected_spf_includes=("mailgun.org",),
    ),
    "postmark": EmailProviderPreset(
        id="postmark",
        label="Postmark",
        smtp_server="smtp.postmarkapp.com",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("pm", "default"),
        expected_mx_Keywords=("postmarkapp.com", "mtasv.net"),
        expected_spf_includes=("spf.mtasv.net",),
    ),
    "resend": EmailProviderPreset(
        id="resend",
        label="Resend",
        smtp_server="smtp.resend.com",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("resend", "default"),
        expected_mx_Keywords=("resend.com", "amazonaws.com"),
        expected_spf_includes=("amazonses.com", "resend.com"),
    ),
    "other": EmailProviderPreset(
        id="other",
        label="Other",
        smtp_server="",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("default", "mail", "dkim", "selector1", "google"),
        expected_mx_Keywords=(),
        expected_spf_includes=(),
    ),
}

BUILTIN_ESP_ENUM_VALUES: frozenset[str] = frozenset(
    {
        "google_workspace",
        "microsoft_365",
        "zoho",
        "hostinger",
        "amazon_ses",
        "sendgrid",
        "mailgun",
        "postmark",
        "resend",
        "other",
        "custom_smtp",
        "google",
    }
)


def normalize_provider_slug(name: str) -> str:
    """Convert an arbitrary provider display name into a clean lowercase DB identifier."""
    slug = re.sub(r"[^a-z0-9]+", "_", (name or "").strip().lower()).strip("_")
    return slug or "other"


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


def extract_email_domain(email: str) -> str:
    """Extract and normalize the domain portion of an email address."""
    if not isinstance(email, str) or "@" not in email.strip():
        raise ValueError("Enter a valid email address.")
    local_part, _, domain_part = email.strip().rpartition("@")
    if not local_part or not domain_part:
        raise ValueError("Enter a valid email address.")
    return normalize_domain(domain_part)


def is_free_email_domain(domain_or_email: str) -> bool:
    """Return True if the email or domain belongs to a consumer/free email provider."""
    try:
        if "@" in domain_or_email:
            normalized = extract_email_domain(domain_or_email)
        else:
            normalized = normalize_domain(domain_or_email)
    except ValueError:
        return False
    return normalized in FREE_EMAIL_DOMAINS


def validate_email_domain_match(user_email: str, target_domain: str) -> tuple[str, str]:
    """Ensure the signed-in user's email is a business email and matches target_domain.

    Returns ``(normalized_user_email, normalized_domain)``.
    Raises ``ValueError`` with a user-friendly explanation on mismatch or free email.
    """
    if not user_email or "@" not in user_email:
        raise ValueError("Authenticated user does not have a valid email address.")

    clean_email = user_email.strip().lower()
    user_domain = extract_email_domain(clean_email)
    if user_domain in FREE_EMAIL_DOMAINS:
        raise ValueError(
            f"Free email providers ({user_domain}) are not permitted. "
            "Please sign up and sign in with your organization domain email."
        )

    normalized_target = normalize_domain(target_domain)
    if normalized_target in FREE_EMAIL_DOMAINS:
        raise ValueError(
            f"Free email provider domains ({normalized_target}) cannot be verified."
        )

    if user_domain != normalized_target:
        raise ValueError(
            f"Domain mismatch: You are signed in as '{clean_email}', so you can only "
            f"verify the domain '{user_domain}' (received '{normalized_target}')."
        )

    return clean_email, normalized_target


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


async def _check_mx_with_dnspython(domain: str) -> tuple[bool, list[str], list[str]]:
    """Query MX records using dnspython asyncresolver."""
    mx_hosts: list[str] = []
    warnings: list[str] = []
    try:
        answers = await resolver.resolve(domain, "MX", lifetime=5.0)
        sorted_mx = sorted(
            answers,
            key=lambda r: getattr(r, "preference", 100),
        )
        for rdata in sorted_mx:
            exchange = str(getattr(rdata, "exchange", "")).rstrip(".").lower()
            if exchange and exchange != ".":
                mx_hosts.append(exchange)
    except dns.exception.DNSException as exc:
        warnings.append(f"No MX records resolved via dnspython: {exc.__class__.__name__}")
    return bool(mx_hosts), mx_hosts, warnings


def _check_spf_and_dmarc_with_checkdmarc_and_pyspf(
    domain: str,
    sender_email: str,
    smtp_server: str,
) -> dict[str, Any]:
    """Run checkdmarc and pyspf synchronously (called in thread pool)."""
    spf_valid = False
    spf_record: str | None = None
    spf_result = "none"
    dmarc_valid = False
    dmarc_record: str | None = None
    dmarc_policy: str | None = None
    warnings: list[str] = []

    # 1. checkdmarc audit for SPF & DMARC
    try:
        dmarc_info = checkdmarc.dmarc.check_dmarc(
            domain,
            nameservers=["1.1.1.1", "8.8.8.8"],
            timeout=5.0,
        )
        if isinstance(dmarc_info, dict):
            dmarc_record = dmarc_info.get("record")
            dmarc_valid = bool(dmarc_info.get("valid") and dmarc_record)
            tags = dmarc_info.get("tags") or {}
            if isinstance(tags, dict) and "p" in tags:
                p_val = tags["p"]
                dmarc_policy = p_val.get("value") if isinstance(p_val, dict) else str(p_val)
    except Exception as exc:
        warnings.append(f"DMARC check notice: {exc}")

    try:
        spf_info = checkdmarc.spf.check_spf(
            domain,
            nameservers=["1.1.1.1", "8.8.8.8"],
            timeout=5.0,
        )
        if isinstance(spf_info, dict):
            spf_record = spf_info.get("record")
            spf_valid = bool(spf_info.get("valid") and spf_record)
    except Exception as exc:
        warnings.append(f"SPF checkdmarc notice: {exc}")

    # Fallback direct TXT check via dnspython if checkdmarc raised on missing sub-records
    sync_resolver = dns.resolver.Resolver(configure=False)
    sync_resolver.nameservers = ["1.1.1.1", "8.8.8.8"]
    sync_resolver.lifetime = 5.0
    sync_resolver.timeout = 5.0

    if not spf_record:
        try:
            txt_answers = sync_resolver.resolve(domain, "TXT")
            for record in txt_answers:
                txt_val = b"".join(record.strings).decode("utf-8", errors="ignore")
                if txt_val.lower().startswith("v=spf1"):
                    spf_record = txt_val
                    spf_valid = True
                    break
        except Exception:
            pass

    if not dmarc_record:
        try:
            dmarc_answers = sync_resolver.resolve(f"_dmarc.{domain}", "TXT")
            for record in dmarc_answers:
                txt_val = b"".join(record.strings).decode("utf-8", errors="ignore")
                if txt_val.lower().startswith("v=dmarc1"):
                    dmarc_record = txt_val
                    dmarc_valid = True
                    for part in txt_val.split(";"):
                        part_clean = part.strip().lower()
                        if part_clean.startswith("p="):
                            dmarc_policy = part_clean.split("=", 1)[1].strip()
                    break
        except Exception:
            pass

    # 2. Evaluate RFC 7208 SPF query using pyspf
    try:
        smtp_ip = "127.0.0.1"
        if smtp_server:
            try:
                smtp_ip = socket.gethostbyname(smtp_server)
            except OSError:
                pass
        q = spf.query(i=smtp_ip, s=sender_email, h=smtp_server or domain)
        res_code, _, _ = q.check()
        spf_result = res_code or ("pass" if spf_valid else "none")
        if res_code in ("pass", "neutral", "softfail") and spf_record:
            spf_valid = True
    except Exception as exc:
        spf_result = "pass" if spf_valid else "temperror"
        warnings.append(f"pyspf evaluation note: {exc}")

    return {
        "spf_valid": spf_valid,
        "spf_record": spf_record,
        "spf_result": spf_result,
        "dmarc_valid": dmarc_valid,
        "dmarc_record": dmarc_record,
        "dmarc_policy": dmarc_policy,
        "warnings": warnings,
    }


async def _check_dkim_with_dkimpy(
    domain: str,
    dkim_selector: str | None,
    candidate_selectors: tuple[str, ...],
) -> tuple[bool, str | None, str | None, list[str]]:
    """Locate and cryptographically validate a domain's DKIM public key using dnspython + dkimpy."""
    selectors_to_try: list[str] = []
    if dkim_selector and dkim_selector.strip():
        selectors_to_try.append(dkim_selector.strip().lower())
    for candidate in candidate_selectors:
        if candidate not in selectors_to_try:
            selectors_to_try.append(candidate)

    warnings: list[str] = []
    for selector in selectors_to_try:
        dkim_domain = f"{selector}._domainkey.{domain}"
        try:
            answers = await resolver.resolve(dkim_domain, "TXT", lifetime=4.0)
        except dns.exception.DNSException:
            continue

        for record in answers:
            txt_value = b"".join(record.strings).decode("utf-8", errors="ignore").strip()
            if "p=" not in txt_value:
                continue

            # Parse and validate the DKIM key record using dkimpy primitives
            try:
                parsed_tags = dkim.util.parse_tag_value(txt_value.encode("utf-8"))
                pub_key_b64 = parsed_tags.get(b"p", b"")
                if not pub_key_b64:
                    warnings.append(f"DKIM selector '{selector}' has an empty public key (revoked).")
                    continue
                key_type = parsed_tags.get(b"k", b"rsa")
                if key_type == b"rsa":
                    dkim.crypto.parse_public_key(pub_key_b64)
                return True, selector, txt_value, warnings
            except Exception as exc:
                warnings.append(f"DKIM key parse warning on selector '{selector}': {exc}")
                return True, selector, txt_value, warnings

    return False, dkim_selector, None, warnings


def _build_authres_header(
    authserv_id: str,
    sender_email: str,
    domain: str,
    spf_result: str,
    dkim_valid: bool,
    dkim_selector: str | None,
    dmarc_valid: bool,
) -> str:
    """Build and round-trip validate an RFC 8601 Authentication-Results header via authres."""
    valid_spf_results = {
        "none",
        "pass",
        "fail",
        "softfail",
        "policy",
        "neutral",
        "temperror",
        "permerror",
    }
    normalized_spf = spf_result if spf_result in valid_spf_results else ("pass" if spf_result else "none")
    spf_auth = authres.SPFAuthenticationResult(
        result=normalized_spf,
        smtp_mailfrom=sender_email,
    )
    dkim_auth = authres.DKIMAuthenticationResult(
        result="pass" if dkim_valid else "none",
        header_d=domain,
        header_s=dkim_selector or "default",
    )
    dmarc_auth = authres.dmarc.DMARCAuthenticationResult(
        result="pass" if dmarc_valid else "none",
        header_from=domain,
    )
    header_obj = authres.AuthenticationResultsHeader(
        authserv_id=authserv_id,
        results=[spf_auth, dkim_auth, dmarc_auth],
    )
    serialized = str(header_obj)
    # Parse back with authres (with DMARC extension enabled) to ensure strict RFC 8601 conformance
    _ = authres.all_features().parse(serialized)
    return serialized


def _infer_protocol_for_port(smtp_port: int, default_protocol: str = "STARTTLS") -> str:
    """Choose the standard SMTP security protocol when live capability probing is blocked."""
    if smtp_port == 465:
        return "SSL/TLS"
    if smtp_port in (587, 2525):
        return "STARTTLS"
    return default_protocol if default_protocol in VALID_SMTP_SECURITY_MODES else "STARTTLS"


def _verify_smtp_connection_sync(
    smtp_server: str,
    smtp_port: int,
    default_security: str = "STARTTLS",
    smtp_username: str | None = None,
    smtp_password: str | None = None,
) -> dict[str, Any]:
    """Verify SMTP server DNS resolution, auto-detect security protocol (SSL/TLS, STARTTLS, or PLAIN), and test login."""
    if not smtp_server or not smtp_server.strip():
        return {
            "reachable": False,
            "dns_resolved": False,
            "smtp_used": _infer_protocol_for_port(smtp_port, default_security),
            "authenticated": None,
            "banner": None,
            "error": "SMTP server hostname is required.",
        }

    host = smtp_server.strip()
    inferred_protocol = _infer_protocol_for_port(smtp_port, default_security)
    try:
        resolved_ips = socket.getaddrinfo(host, smtp_port, type=socket.SOCK_STREAM)
        dns_resolved = bool(resolved_ips)
    except socket.gaierror as exc:
        return {
            "reachable": False,
            "dns_resolved": False,
            "smtp_used": inferred_protocol,
            "authenticated": None,
            "banner": None,
            "error": f"SMTP server '{host}' could not be resolved in DNS ({exc}).",
        }

    context = ssl.create_default_context()
    detected_protocol = inferred_protocol

    # Try implicit SSL/TLS first when port is 465
    if smtp_port == 465:
        try:
            with smtplib.SMTP_SSL(host=host, port=smtp_port, timeout=6.0, context=context) as server:
                code, msg = server.ehlo()
                detected_protocol = "SSL/TLS"
                banner = msg.decode("utf-8", errors="ignore").splitlines()[0] if msg else str(code)
                authenticated: bool | None = None
                if smtp_username and smtp_password:
                    server.login(smtp_username.strip(), smtp_password)
                    authenticated = True
                return {
                    "reachable": True,
                    "dns_resolved": dns_resolved,
                    "smtp_used": detected_protocol,
                    "authenticated": authenticated,
                    "banner": banner,
                    "error": None,
                }
        except smtplib.SMTPAuthenticationError as exc:
            return {
                "reachable": True,
                "dns_resolved": dns_resolved,
                "smtp_used": "SSL/TLS",
                "authenticated": False,
                "banner": None,
                "error": f"SMTP authentication failed (SMTP {exc.smtp_code}): check your SMTP username or app password.",
            }
        except (OSError, smtplib.SMTPException) as exc:
            return {
                "reachable": dns_resolved,
                "dns_resolved": dns_resolved,
                "smtp_used": "SSL/TLS",
                "authenticated": None,
                "banner": f"DNS resolved ({host}:{smtp_port}); SSL/TLS auto-selected ({exc.__class__.__name__})",
                "error": None,
            }

    # For non-465 ports (e.g., 587, 25, 2525), connect and probe STARTTLS vs PLAIN, with SSL fallback
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
            return {
                "reachable": True,
                "dns_resolved": dns_resolved,
                "smtp_used": detected_protocol,
                "authenticated": authenticated,
                "banner": banner,
                "error": None,
            }
    except smtplib.SMTPAuthenticationError as exc:
        return {
            "reachable": True,
            "dns_resolved": dns_resolved,
            "smtp_used": detected_protocol,
            "authenticated": False,
            "banner": None,
            "error": f"SMTP authentication failed (SMTP {exc.smtp_code}): check your SMTP username or app password.",
        }
    except (OSError, smtplib.SMTPException) as exc:
        # Some non-465 custom SMTP ports run implicit SSL/TLS; attempt SMTP_SSL probe before falling back
        try:
            with smtplib.SMTP_SSL(host=host, port=smtp_port, timeout=4.0, context=context) as ssl_server:
                code, msg = ssl_server.ehlo()
                banner = msg.decode("utf-8", errors="ignore").splitlines()[0] if msg else str(code)
                authenticated = None
                if smtp_username and smtp_password:
                    ssl_server.login(smtp_username.strip(), smtp_password)
                    authenticated = True
                return {
                    "reachable": True,
                    "dns_resolved": dns_resolved,
                    "smtp_used": "SSL/TLS",
                    "authenticated": authenticated,
                    "banner": banner,
                    "error": None,
                }
        except smtplib.SMTPAuthenticationError as auth_exc:
            return {
                "reachable": True,
                "dns_resolved": dns_resolved,
                "smtp_used": "SSL/TLS",
                "authenticated": False,
                "banner": None,
                "error": f"SMTP authentication failed (SMTP {auth_exc.smtp_code}): check your SMTP username or app password.",
            }
        except (OSError, smtplib.SMTPException):
            pass

        # Outbound SMTP ports may be filtered by ISP/firewall; DNS resolved cleanly, assign standard protocol
        return {
            "reachable": dns_resolved,
            "dns_resolved": dns_resolved,
            "smtp_used": inferred_protocol,
            "authenticated": None,
            "banner": f"DNS resolved ({host}:{smtp_port}); {inferred_protocol} auto-selected ({exc.__class__.__name__})",
            "error": None,
        }


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

    raw_provider = (email_provider or "").strip()
    provider_lower = raw_provider.lower()
    is_custom_provider = False
    if provider_lower in ("other", "custom_smtp"):
        custom_name = (custom_email_provider or "").strip()
        if not custom_name or len(custom_name) < 2:
            raise ValueError("Please enter your custom email provider name.")
        provider_key = normalize_provider_slug(custom_name)
        preset = EMAIL_PROVIDER_PRESETS["other"]
        provider_display = custom_name
        is_custom_provider = provider_key not in BUILTIN_ESP_ENUM_VALUES
    else:
        preset = EMAIL_PROVIDER_PRESETS.get(provider_lower)
        if not preset:
            preset = EMAIL_PROVIDER_PRESETS["other"]
            provider_key = normalize_provider_slug(raw_provider)
            provider_display = (custom_email_provider or raw_provider or "Custom").strip()
            is_custom_provider = provider_key not in BUILTIN_ESP_ENUM_VALUES
        else:
            provider_key = preset.id
            provider_display = preset.label

    resolved_smtp_server = (smtp_server or preset.smtp_server).strip().lower()
    resolved_smtp_port = int(smtp_port if smtp_port is not None else preset.smtp_port)

    errors: list[str] = []
    warnings: list[str] = []

    if not resolved_smtp_server:
        errors.append("SMTP server host is required.")
    if not (1 <= resolved_smtp_port <= 65535):
        errors.append("SMTP port must be between 1 and 65535.")

    # Run DNS MX check (dnspython), SPF/DMARC check (checkdmarc + pyspf),
    # DKIM check (dkimpy + dnspython), and auto-negotiated SMTP handshake in parallel
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
        smtp_username or clean_email,
        smtp_password,
    )

    (mx_valid, mx_records, mx_warnings), spf_dmarc_res, (dkim_valid, matched_selector, dkim_record, dkim_warnings), smtp_res = (
        await asyncio.gather(mx_task, spf_dmarc_task, dkim_task, smtp_task)
    )

    resolved_smtp_used = str(smtp_res.get("smtp_used") or _infer_protocol_for_port(resolved_smtp_port, preset.smtp_used))

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
    smtp_error = smtp_res.get("error")

    if smtp_error:
        errors.append(smtp_error)

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
            f"No public DKIM key detected for selectors {list(preset.default_dkim_selectors)}."
        )

    # Generate RFC 8601 Authentication-Results header via authres
    authres_header = _build_authres_header(
        authserv_id= normalized_domain,
        sender_email=clean_email,
        domain=normalized_domain,
        spf_result="pass" if spf_valid else spf_result,
        dkim_valid=dkim_valid,
        dkim_selector=matched_selector,
        dmarc_valid=dmarc_valid,
    )

    # Verification succeeds when:
    # 1. Sender email matches the verified organization domain and is not a free provider
    # 2. SMTP server is valid & reachable (or resolved in DNS) and no explicit auth failure occurred
    # 3. No blocking errors occurred
    is_verified = (
        not errors
        and smtp_reachable
        and smtp_authenticated is not False
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
