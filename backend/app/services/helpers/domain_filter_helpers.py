"""Helper functions for URL path blocking and platform company domain extraction."""

from __future__ import annotations

import re
from typing import Optional, Tuple
from urllib.parse import urlparse

from app.utils.constants.prospecting_constants import BLOCKED_DOMAINS, PLATFORM_DOMAINS
from app.utils.helpers.domain_helpers import extract_registered_domain


def is_blocked_platform_path(domain: str, path: str) -> bool:
    """Return True if a platform URL (LinkedIn, Facebook, etc.) is a non-company path."""
    if domain == "linkedin.com":
        if any(path.startswith(p) for p in ("/jobs", "/job", "/hiring", "/feed", "/posts", "/pulse", "/learning")):
            return True
        if not any(path.startswith(p) for p in ("/company/", "/school/", "/showcase/")):
            return True
        if path in ("/company", "/school", "/showcase"):
            return True
    elif domain in ("facebook.com", "instagram.com", "twitter.com", "x.com"):
        if any(skip in path for skip in ("/sharer", "/share.php", "/dialog", "/help", "/settings", "/policy")):
            return True
    return False


def extract_linkedin_company_info(
    url: str,
    title: str = "",
    snippet: str = "",
) -> Tuple[str, str, Optional[str]]:
    """Extract (domain, website, linkedin_url) from a LinkedIn company profile URL."""
    parsed = urlparse(url)
    path_parts = [p for p in parsed.path.strip("/").split("/") if p]
    slug = path_parts[1] if len(path_parts) >= 2 else (path_parts[0] if path_parts else "company")

    external_domain = None
    for word in re.findall(r"[a-zA-Z0-9-]+\.[a-zA-Z]{2,}", f"{title} {snippet}"):
        extracted = extract_registered_domain(word)
        if extracted and extracted not in PLATFORM_DOMAINS and extracted not in BLOCKED_DOMAINS:
            external_domain = extracted
            break

    domain = external_domain or f"{slug}.linkedin"
    website = f"https://{external_domain}" if external_domain else url
    return domain, website, url


def extract_platform_company_info(url: str, reg_domain: str) -> Tuple[str, str, Optional[str]]:
    """Extract (domain, website, linkedin_url) from a non-LinkedIn social platform URL."""
    parsed = urlparse(url)
    path_parts = [p for p in parsed.path.strip("/").split("/") if p]
    slug = path_parts[0] if path_parts else "page"
    domain = f"{slug}.{reg_domain.split('.')[0]}"
    return domain, url, None
