"""DNS primitives for verifying ownership of a domain."""

from __future__ import annotations

import logging
import secrets

import dns.exception

from app.domain.verification.helpers.dns_helpers import (
    create_async_dns_resolver,
    matches_txt_token,
)
from app.utils.constants.dns_constants import (
    _DNS_LIFETIME_SECONDS,
    _VERIFICATION_HOST,
    _VERIFICATION_PREFIX,
)
from app.utils.helpers.domain_helpers import normalize_domain

logger = logging.getLogger(__name__)
resolver = create_async_dns_resolver()


def new_token() -> str:
    """Create a cryptographically secure, URL-safe DNS TXT value."""
    return f"{_VERIFICATION_PREFIX}{secrets.token_urlsafe(24)}"


async def is_verified(domain: str, token: str) -> bool:
    """Return whether the expected verification token is published in DNS."""
    if not isinstance(token, str) or not token.startswith(_VERIFICATION_PREFIX):
        logger.warning("[DNS] Invalid verification token format: %s", token)
        return False

    try:
        normalized_domain = normalize_domain(domain)
        host_target = f"{_VERIFICATION_HOST}.{normalized_domain}"
        logger.info("[DNS] Querying TXT records for %s", host_target)
        answers = await resolver.resolve(
            host_target,
            "TXT",
            lifetime=_DNS_LIFETIME_SECONDS,
        )
    except (dns.exception.DNSException, ValueError) as exc:
        logger.info("[DNS] TXT record not found or lookup failed for %s.%s: %s", _VERIFICATION_HOST, domain, exc)
        return False

    matched = matches_txt_token(answers, token)
    logger.info("[DNS] TXT verification result for %s: %s", normalized_domain, "VERIFIED" if matched else "MISMATCH")
    return matched


__all__ = [
    "_DNS_LIFETIME_SECONDS",
    "_VERIFICATION_HOST",
    "_VERIFICATION_PREFIX",
    "is_verified",
    "new_token",
    "normalize_domain",
    "resolver",
]
