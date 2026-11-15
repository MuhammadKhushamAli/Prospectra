"""SPF and DMARC DNS verification helpers using checkdmarc, dnspython, and pyspf."""

from __future__ import annotations

import socket
from typing import Any

import checkdmarc
import dns.resolver
import spf

from app.domain.verification.helpers.dns_helpers import create_sync_dns_resolver
from app.domain.verification.models import SpfDmarcAuditResult
from app.utils.constants.dns_constants import DEFAULT_DNS_NAMESERVERS, _DNS_LIFETIME_SECONDS


def audit_dmarc_with_checkdmarc(
    domain: str,
    warnings: list[str],
) -> tuple[bool, str | None, str | None]:
    """Audit DMARC record for a domain via checkdmarc."""
    dmarc_valid = False
    dmarc_record: str | None = None
    dmarc_policy: str | None = None
    try:
        dmarc_info = checkdmarc.dmarc.check_dmarc(
            domain,
            nameservers=list(DEFAULT_DNS_NAMESERVERS),
            timeout=_DNS_LIFETIME_SECONDS,
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
    return dmarc_valid, dmarc_record, dmarc_policy


def audit_spf_with_checkdmarc(
    domain: str,
    warnings: list[str],
) -> tuple[bool, str | None]:
    """Audit SPF record for a domain via checkdmarc."""
    spf_valid = False
    spf_record: str | None = None
    try:
        spf_info = checkdmarc.spf.check_spf(
            domain,
            nameservers=list(DEFAULT_DNS_NAMESERVERS),
            timeout=_DNS_LIFETIME_SECONDS,
        )
        if isinstance(spf_info, dict):
            spf_record = spf_info.get("record")
            spf_valid = bool(spf_info.get("valid") and spf_record)
    except Exception as exc:
        warnings.append(f"SPF checkdmarc notice: {exc}")
    return spf_valid, spf_record


def fallback_resolve_spf_txt(
    sync_resolver: dns.resolver.Resolver,
    domain: str,
) -> tuple[bool, str | None]:
    """Direct TXT fallback lookup for v=spf1 record via dnspython."""
    try:
        txt_answers = sync_resolver.resolve(domain, "TXT")
        for record in txt_answers:
            txt_val = b"".join(record.strings).decode("utf-8", errors="ignore")
            if txt_val.lower().startswith("v=spf1"):
                return True, txt_val
    except Exception:
        pass
    return False, None


def fallback_resolve_dmarc_txt(
    sync_resolver: dns.resolver.Resolver,
    domain: str,
) -> tuple[bool, str | None, str | None]:
    """Direct TXT fallback lookup for _dmarc.<domain> v=dmarc1 record via dnspython."""
    try:
        dmarc_answers = sync_resolver.resolve(f"_dmarc.{domain}", "TXT")
        for record in dmarc_answers:
            txt_val = b"".join(record.strings).decode("utf-8", errors="ignore")
            if txt_val.lower().startswith("v=dmarc1"):
                policy = None
                for part in txt_val.split(";"):
                    part_clean = part.strip().lower()
                    if part_clean.startswith("p="):
                        policy = part_clean.split("=", 1)[1].strip()
                return True, txt_val, policy
    except Exception:
        pass
    return False, None, None


def evaluate_pyspf_query(
    domain: str,
    sender_email: str,
    smtp_server: str,
    spf_valid: bool,
    spf_record: str | None,
    warnings: list[str],
) -> tuple[bool, str]:
    """Evaluate RFC 7208 SPF query using pyspf."""
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
        return spf_valid, spf_result
    except Exception as exc:
        warnings.append(f"pyspf evaluation note: {exc}")
        return spf_valid, ("pass" if spf_valid else "temperror")


def _check_spf_and_dmarc_with_checkdmarc_and_pyspf(
    domain: str,
    sender_email: str,
    smtp_server: str,
) -> dict[str, Any]:
    """Run checkdmarc and pyspf synchronously and return SpfDmarcAuditResult dict."""
    warnings: list[str] = []

    dmarc_valid, dmarc_record, dmarc_policy = audit_dmarc_with_checkdmarc(domain, warnings)
    spf_valid, spf_record = audit_spf_with_checkdmarc(domain, warnings)

    sync_resolver = create_sync_dns_resolver()
    if not spf_record:
        spf_valid, spf_record = fallback_resolve_spf_txt(sync_resolver, domain)

    if not dmarc_record:
        dmarc_valid, dmarc_record, dmarc_policy = fallback_resolve_dmarc_txt(sync_resolver, domain)

    spf_valid, spf_result = evaluate_pyspf_query(
        domain=domain,
        sender_email=sender_email,
        smtp_server=smtp_server,
        spf_valid=spf_valid,
        spf_record=spf_record,
        warnings=warnings,
    )

    audit = SpfDmarcAuditResult(
        spf_valid=spf_valid,
        spf_record=spf_record,
        spf_result=spf_result,
        dmarc_valid=dmarc_valid,
        dmarc_record=dmarc_record,
        dmarc_policy=dmarc_policy,
        warnings=warnings,
    )
    return audit.to_dict()
