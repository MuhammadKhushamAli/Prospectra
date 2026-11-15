"""Asynchronous web scraper for extracting company profiles and contact details."""

import asyncio
from typing import Dict, List, Optional, Set

from bs4 import BeautifulSoup
import httpx

from app.models.company import ScrapedProfile
from app.services.helpers.web_scraper_helpers import (
    clean_emails,
    decode_cloudflare_email,
    discover_internal_subpages,
    extract_about_text,
    extract_contacts_from_soup,
    extract_services_and_features,
    extract_social_links,
    extract_website_from_platform_html,
    fetch_page,
)
from app.utils.constants.scraper_constants import (
    CANDIDATE_PATH_KEYWORDS,
    DISALLOWED_EMAIL_DOMAINS,
    DISALLOWED_EMAIL_LOCAL_PARTS,
    EMAIL_REGEX,
    OBFUSCATED_AT,
    OBFUSCATED_DOT,
    PHONE_REGEX,
    USER_AGENT,
)
from app.utils.helpers.domain_helpers import extract_registered_domain


async def scrape_company(
    client: httpx.AsyncClient,
    website: str,
    domain: str,
    max_pages: int = 5,
    timeout: float = 12.0,
) -> ScrapedProfile:
    """Scrape a target company website to extract profile text, emails, phones, and socials."""
    target_url = website
    if not target_url or not target_url.startswith(("http://", "https://")):
        target_url = f"https://{domain}"

    homepage_res = await fetch_page(client, target_url, timeout=timeout)
    if not homepage_res and target_url.startswith("https://"):
        homepage_res = await fetch_page(client, target_url.replace("https://", "http://"), timeout=timeout)

    if not homepage_res:
        return ScrapedProfile(fetch_ok=False)

    final_url, homepage_html = homepage_res
    visited_urls: List[str] = [final_url]
    raw_emails: Set[str] = set()
    raw_phones: Set[str] = set()
    social_links: Dict[str, str] = {}
    about_text_pieces: List[str] = []
    discovered_website: Optional[str] = None
    discovered_domain: Optional[str] = None

    if "linkedin.com/company" in target_url:
        social_links["linkedin"] = target_url
        official_website = extract_website_from_platform_html(homepage_html)
        if official_website:
            official_domain = extract_registered_domain(official_website)
            if official_domain and official_domain != "linkedin.com":
                discovered_website = official_website
                discovered_domain = official_domain
                print(
                    f"  [LINKEDIN CRAWL] Discovered official company website from LinkedIn: "
                    f"{official_website} ({official_domain})"
                )
                official_res = await fetch_page(client, official_website, timeout=timeout)
                if official_res:
                    final_url, homepage_html = official_res
                    visited_urls = [final_url]
                    domain = official_domain

    soup = BeautifulSoup(homepage_html, "lxml")
    services_offered, digital_features = extract_services_and_features(soup, homepage_html)
    title = soup.title.string.strip() if (soup.title and soup.title.string) else ""
    meta_desc = ""
    meta_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "description"})
    if meta_tag and meta_tag.get("content"):
        meta_desc = meta_tag["content"].strip()

    social_links.update(extract_social_links(soup))
    about_text_pieces.append(extract_about_text(soup, meta_desc))
    extract_contacts_from_soup(soup, raw_emails, raw_phones, deobfuscate=False)

    base_domain = extract_registered_domain(final_url) or domain
    internal_subpages = discover_internal_subpages(soup, final_url, base_domain, visited_urls)

    pages_to_fetch = internal_subpages[: max_pages - 1]
    if pages_to_fetch:
        tasks = [fetch_page(client, u, timeout=timeout) for u in pages_to_fetch]
        subpage_results = await asyncio.gather(*tasks, return_exceptions=True)

        for res in subpage_results:
            if not isinstance(res, tuple) or not res:
                continue
            sub_url, sub_html = res
            visited_urls.append(sub_url)
            sub_soup = BeautifulSoup(sub_html, "lxml")

            extract_contacts_from_soup(sub_soup, raw_emails, raw_phones, deobfuscate=True)
            social_links.update(extract_social_links(sub_soup))
            sub_about = extract_about_text(sub_soup, "")
            if sub_about:
                about_text_pieces.append(sub_about)

    final_about = " ".join(about_text_pieces)[:3000]
    cleaned_email_list = clean_emails(raw_emails, domain)

    return ScrapedProfile(
        about_text=final_about,
        meta_description=meta_desc,
        title=title,
        pages_visited=visited_urls,
        emails=cleaned_email_list,
        phones=list(raw_phones)[:4],
        social_links=social_links,
        fetch_ok=True,
        discovered_website=discovered_website,
        discovered_domain=discovered_domain,
        services_offered=services_offered,
        digital_features=digital_features,
    )


__all__ = [
    "CANDIDATE_PATH_KEYWORDS",
    "DISALLOWED_EMAIL_DOMAINS",
    "DISALLOWED_EMAIL_LOCAL_PARTS",
    "EMAIL_REGEX",
    "OBFUSCATED_AT",
    "OBFUSCATED_DOT",
    "PHONE_REGEX",
    "USER_AGENT",
    "clean_emails",
    "decode_cloudflare_email",
    "extract_about_text",
    "extract_services_and_features",
    "extract_social_links",
    "extract_website_from_platform_html",
    "fetch_page",
    "scrape_company",
]
