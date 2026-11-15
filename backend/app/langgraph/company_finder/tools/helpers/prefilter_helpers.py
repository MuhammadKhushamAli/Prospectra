"""Helper functions for deterministic pre-filtering of scraped companies."""

from app.utils.constants.prospecting_constants import PARKED_DOMAIN_PATTERNS


def is_parked_or_empty(text: str, email_count: int) -> bool:
    """Check if the website is a parked domain or empty placeholder."""
    for pat in PARKED_DOMAIN_PATTERNS:
        if pat.search(text):
            return True
    if len(text.strip()) < 60 and email_count == 0:
        return True
    return False
