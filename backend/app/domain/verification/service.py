"""Public operations for starting and completing domain verification."""

from __future__ import annotations

from .dns import is_verified, new_token, normalize_domain
from .models import DomainVerificationInstructions


def start_domain_verification(domain: str) -> DomainVerificationInstructions:
    """Prepare the DNS TXT record that the user must publish."""
    normalized_domain = normalize_domain(domain)
    return DomainVerificationInstructions(
        domain=normalized_domain,
        record_type="TXT",
        record_name="_prospectra",
        record_value=new_token(),
    )


async def verify_domain(domain: str, token: str) -> bool:
    """Check the DNS TXT record for a token returned by the start operation."""
    return await is_verified(domain, token)

