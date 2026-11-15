"""Domain filtering, blocklist, and heuristic classification utilities."""

from typing import Optional, Tuple
from urllib.parse import urlparse

from app.services.helpers.domain_filter_helpers import (
    extract_linkedin_company_info,
    extract_platform_company_info,
    is_blocked_platform_path,
)
from app.utils.constants.prospecting_constants import (
    AGENCY_KEYWORDS,
    BLOCKED_DOMAINS,
    BLOCKED_PATH_PATTERNS,
    BLOCKED_TLDS,
    JOB_INDICATOR_PATTERNS,
    LISTICLE_TITLE_RE,
    PLATFORM_DOMAINS,
)
from app.utils.helpers.domain_helpers import extract_registered_domain


def is_job_posting(title: str = "", url: str = "", snippet: str = "") -> bool:
    """Detect if a search candidate represents a job vacancy or hiring post rather than a company."""
    if url:
        parsed = urlparse(url)
        path = parsed.path.lower()
        for pat in BLOCKED_PATH_PATTERNS:
            if pat.search(path):
                return True
        if any(term in parsed.query.lower() for term in ("job", "career", "hiring", "vacancy")):
            return True

    text_to_check = f"{title} {snippet}".strip()
    if text_to_check:
        for pat in JOB_INDICATOR_PATTERNS:
            if pat.search(text_to_check):
                return True

    return False


def is_blocked_url(url: str) -> bool:
    """Check if the URL belongs to a blocked domain, TLD, job board, or job path pattern."""
    domain = extract_registered_domain(url)
    if not domain or domain in BLOCKED_DOMAINS:
        return True

    if any(domain.endswith(tld) for tld in BLOCKED_TLDS):
        return True

    try:
        parsed = urlparse(url)
        path = parsed.path.lower().rstrip("/")
    except Exception:
        return True

    if any(pat.search(path) for pat in BLOCKED_PATH_PATTERNS):
        return True

    if domain in PLATFORM_DOMAINS and is_blocked_platform_path(domain, path):
        return True

    return False


def extract_company_info_from_url(
    url: str,
    title: str = "",
    snippet: str = "",
) -> Tuple[str, str, Optional[str]]:
    """Extract distinct company domain, primary website, and linkedin_url."""
    reg_domain = extract_registered_domain(url) or "unknown.com"

    if reg_domain == "linkedin.com":
        return extract_linkedin_company_info(url, title, snippet)

    if reg_domain in PLATFORM_DOMAINS:
        return extract_platform_company_info(url, reg_domain)

    return reg_domain, f"https://{reg_domain}", None


def is_listicle_title(title: str) -> bool:
    """Check if a search result title indicates a listicle or directory."""
    if not title:
        return False
    return bool(LISTICLE_TITLE_RE.search(title.strip()))


def count_agency_keyword_hits(text: str) -> int:
    """Count how many agency/dev-shop indicator phrases appear in text."""
    if not text:
        return 0
    lower_text = text.lower()
    return sum(1 for kw in AGENCY_KEYWORDS if kw in lower_text)


__all__ = [
    "AGENCY_KEYWORDS",
    "BLOCKED_DOMAINS",
    "BLOCKED_PATH_PATTERNS",
    "BLOCKED_TLDS",
    "JOB_INDICATOR_PATTERNS",
    "LISTICLE_TITLE_RE",
    "PLATFORM_DOMAINS",
    "count_agency_keyword_hits",
    "extract_company_info_from_url",
    "extract_registered_domain",
    "is_blocked_url",
    "is_job_posting",
    "is_listicle_title",
]
