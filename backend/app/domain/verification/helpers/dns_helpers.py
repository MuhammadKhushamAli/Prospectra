"""DNS resolver initialization, TXT record decoding, and DNS instruction formatting helpers."""

from __future__ import annotations

import json
import secrets
from typing import Any

import dns.asyncresolver
import dns.resolver

from app.domain.verification.models import DNSInstructionPayload
from app.utils.constants.dns_constants import (
    DEFAULT_DNS_NAMESERVERS,
    DNS_INSTRUCTIONS_TITLE,
    _DNS_LIFETIME_SECONDS,
    _VERIFICATION_HOST,
)


def create_async_dns_resolver() -> dns.asyncresolver.Resolver:
    """Create and configure a dnspython async resolver using public nameservers."""
    res = dns.asyncresolver.Resolver(configure=False)
    res.nameservers = list(DEFAULT_DNS_NAMESERVERS)
    res.lifetime = _DNS_LIFETIME_SECONDS
    res.timeout = _DNS_LIFETIME_SECONDS
    return res


def create_sync_dns_resolver() -> dns.resolver.Resolver:
    """Create and configure a synchronous dnspython resolver using public nameservers."""
    res = dns.resolver.Resolver(configure=False)
    res.nameservers = list(DEFAULT_DNS_NAMESERVERS)
    res.lifetime = _DNS_LIFETIME_SECONDS
    res.timeout = _DNS_LIFETIME_SECONDS
    return res


def decode_txt_rdata(record: Any) -> str | None:
    """Decode a dnspython TXT record's byte strings into a UTF-8 string."""
    try:
        return b"".join(record.strings).decode("utf-8")
    except (AttributeError, UnicodeDecodeError, TypeError):
        return None


def matches_txt_token(answers: Any, expected_token: str) -> bool:
    """Return True if any TXT record in answers matches expected_token in constant time."""
    for record in answers:
        value = decode_txt_rdata(record)
        if value is not None and secrets.compare_digest(value, expected_token):
            return True
    return False


def build_dns_instructions(
    token: str,
    host: str = _VERIFICATION_HOST,
    record_type: str = "TXT",
) -> dict[str, str]:
    """Construct the user-facing DNS TXT record instructions dictionary via DNSInstructionPayload."""
    payload = DNSInstructionPayload(
        title=DNS_INSTRUCTIONS_TITLE,
        type=record_type,
        host=host,
        value=token,
    )
    return payload.to_dict()


def parse_dns_records_dict(raw_dns_records: Any) -> dict[str, Any]:
    """Safely normalize a raw dns_records column value (dict or JSON string) into a dict."""
    if isinstance(raw_dns_records, dict):
        return dict(raw_dns_records)
    if isinstance(raw_dns_records, str):
        try:
            parsed = json.loads(raw_dns_records)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return {}
