"""DNS primitives for verifying ownership of a domain."""

from __future__ import annotations

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

resolver = create_async_dns_resolver()


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
    except (dns.exception.DNSException, ValueError):
        return False

    return matches_txt_token(answers, token)


__all__ = [
    "_DNS_LIFETIME_SECONDS",
    "_VERIFICATION_HOST",
    "_VERIFICATION_PREFIX",
    "is_verified",
    "new_token",
    "normalize_domain",
    "resolver",
]
