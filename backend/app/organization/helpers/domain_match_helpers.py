"""Domain validation helpers to ensure teammate invitations match verified organization domain."""

from __future__ import annotations

from typing import Any, Optional

from app.utils.constants.db_tables import DOMAIN_VERIFICATIONS_TABLE
from app.utils.helpers.domain_helpers import normalize_domain


def extract_email_domain_part(email: str) -> str:
    """Extract and normalize the domain component of an email address."""
    clean = (email or "").strip().lower()
    if "@" not in clean:
        return ""
    return normalize_domain(clean.split("@", 1)[1])


async def fetch_org_verified_domain(supabase: Any, org_id: str) -> Optional[str]:
    """Query the verified domain for an organization from domain_verifications."""
    try:
        res = await (
            supabase.table(DOMAIN_VERIFICATIONS_TABLE)
            .select("domain, verification_status")
            .eq("org_id", org_id)
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            row = res.data[0]
            domain = row.get("domain")
            return normalize_domain(domain) if domain else None
    except Exception:
        pass
    return None


def verify_email_matches_org_domain(email: str, org_domain: Optional[str]) -> bool:
    """Check if the email address domain strictly matches the organization's verified domain."""
    if not email or not org_domain:
        return False
    email_domain = extract_email_domain_part(email)
    expected_domain = normalize_domain(org_domain)
    return bool(email_domain and expected_domain and email_domain == expected_domain)


__all__ = [
    "extract_email_domain_part",
    "fetch_org_verified_domain",
    "verify_email_matches_org_domain",
]
