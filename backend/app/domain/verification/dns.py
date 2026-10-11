"""DNS primitives for verifying ownership of a domain."""

from __future__ import annotations

import secrets
from urllib.parse import urlsplit

import dns.asyncresolver
import dns.exception
import tldextract


_VERIFICATION_PREFIX = "prospectra-verify="
_VERIFICATION_HOST = "_prospectra"
_DNS_LIFETIME_SECONDS = 5.0
_EXTRACT_DOMAIN = tldextract.TLDExtract(
    suffix_list_urls=(),
    include_psl_private_domains=True,
)

resolver = dns.asyncresolver.Resolver(configure=False)
resolver.nameservers = ["1.1.1.1", "8.8.8.8"]
resolver.lifetime = _DNS_LIFETIME_SECONDS
resolver.timeout = _DNS_LIFETIME_SECONDS


def normalize_domain(raw: str) -> str:
    """Return the registrable domain in lowercase ASCII (IDNA) form."""
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("A domain is required")

    candidate = raw.strip()
    parsed = urlsplit(candidate if "://" in candidate else f"//{candidate}")
    if parsed.username or parsed.password or parsed.path not in ("", "/"):
        raise ValueError("Enter a domain name, not a URL or path")
    if parsed.query or parsed.fragment:
        raise ValueError("Enter a domain name without a query or fragment")

    try:
        hostname = parsed.hostname
        _ = parsed.port  # Force validation of malformed ports.
    except ValueError as exc:
        raise ValueError("Invalid domain name") from exc
    if not hostname:
        raise ValueError("A domain is required")

    extracted = _EXTRACT_DOMAIN(hostname.rstrip("."))
    if not extracted.domain or not extracted.suffix:
        raise ValueError("Enter a fully-qualified domain name")

    registrable = f"{extracted.domain}.{extracted.suffix}"
    try:
        normalized = ".".join(
            label.encode("idna").decode("ascii")
            for label in registrable.split(".")
        ).lower()
    except UnicodeError as exc:
        raise ValueError("Invalid internationalized domain name") from exc

    if len(normalized) > 253 or any(
        not label or len(label) > 63 for label in normalized.split(".")
    ):
        raise ValueError("Invalid domain name")
    return normalized


def new_token() -> str:
    """Create a cryptographically secure, URL-safe DNS TXT value."""
    return f"{_VERIFICATION_PREFIX}{secrets.token_urlsafe(24)}"


async def is_verified(domain: str, token: str) -> bool:
    """Return whether the expected verification token is published in DNS."""
    if not isinstance(token, str) or not token.startswith(_VERIFICATION_PREFIX):
        return False

    try:
        normalized_domain = normalize_domain(domain)
        answers = await resolver.resolve(
            f"{_VERIFICATION_HOST}.{normalized_domain}",
            "TXT",
            lifetime=_DNS_LIFETIME_SECONDS,
        )
    except dns.exception.DNSException:
        return False
    except ValueError:
        return False

    for record in answers:
        try:
            value = b"".join(record.strings).decode("utf-8")
        except (AttributeError, UnicodeDecodeError, TypeError):
            continue
        if secrets.compare_digest(value, token):
            return True
    return False

