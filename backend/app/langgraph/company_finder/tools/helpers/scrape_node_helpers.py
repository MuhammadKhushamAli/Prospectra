"""Helper functions for scraping company websites and building assumed generic emails."""

from __future__ import annotations

import asyncio
from typing import List, Optional, Set

import httpx

from app.core.logging_config import get_node_logger
from app.models.company import Company, CompanyEmail
from app.services.web_scraper import scrape_company
from app.utils.constants.prospecting_constants import (
    GUESS_GENERIC_EMAILS,
    MAX_PAGES,
    SCRAPER_TIMEOUT,
    STANDARD_GUESS_PREFIXES,
)
from app.utils.helpers.domain_helpers import extract_registered_domain

logger = get_node_logger("scrape_companies")


def determine_email_role(email: str) -> str:
    """Classify email role based on local part prefix."""
    local, _, _ = email.partition("@")
    clean_local = local.lower()
    if clean_local in ("info", "contact", "hello", "office", "help"):
        return "Generic"
    if clean_local in ("sales", "biz", "business", "orders", "inquiries"):
        return "Sales"
    if clean_local in ("support", "customerservice", "service"):
        return "Support"
    return "Person"


def build_assumed_company_emails(
    domain: str,
    exclude_emails: Optional[Set[str]] = None,
) -> List[CompanyEmail]:
    """Build standard generic domain email assumptions (e.g. contact@domain) for verification."""
    if not domain or not isinstance(domain, str):
        return []

    clean_domain = (
        extract_registered_domain(domain)
        or domain.strip().lower().removeprefix("www.")
    ).strip()
    if not clean_domain or "." not in clean_domain:
        return []

    excluded = {e.strip().lower() for e in (exclude_emails or set()) if e}
    assumed: List[CompanyEmail] = []
    for prefix in STANDARD_GUESS_PREFIXES:
        guessed_addr = f"{prefix}@{clean_domain}"
        if guessed_addr in excluded:
            continue
        assumed.append(
            CompanyEmail(
                email=guessed_addr,
                email_of=determine_email_role(guessed_addr),
                source="guessed",
            )
        )
    return assumed


async def scrape_single_company(
    client: httpx.AsyncClient,
    company: Company,
    semaphore: asyncio.Semaphore,
) -> Company:
    """Scrape a single company website with concurrency control."""
    async with semaphore:
        profile = await scrape_company(
            client=client,
            website=company.website or f"https://{company.domain}",
            domain=company.domain,
            max_pages=MAX_PAGES,
            timeout=SCRAPER_TIMEOUT,
        )
        company.scraped = profile

        if profile.discovered_domain:
            company.domain = profile.discovered_domain
        if profile.discovered_website:
            company.website = profile.discovered_website
        if profile.social_links.get("linkedin") and not company.linkedin_url:
            company.linkedin_url = profile.social_links.get("linkedin")

        email_objects: List[CompanyEmail] = [
            CompanyEmail(
                email=e,
                email_of=determine_email_role(e),
                source="scraped",
            )
            for e in profile.emails
        ]

        if not email_objects and GUESS_GENERIC_EMAILS and profile.fetch_ok:
            email_objects.extend(build_assumed_company_emails(company.domain))

        company.emails = email_objects
        return company


def log_scraped_company_details(res: Company) -> None:
    """No-op kept for helper export compatibility (detailed per-company logs replaced by batch counts)."""
    return None
