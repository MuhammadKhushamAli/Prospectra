"""LangGraph node for scraping company websites."""

import asyncio
import os
from typing import Any, Dict, List

import httpx

from ..state.state import GraphState
from app.models.company import Company, CompanyEmail
from app.services.web_scraper import scrape_company

SCRAPER_CONCURRENCY = int(os.environ.get("SCRAPER_CONCURRENCY", "10"))
SCRAPER_TIMEOUT = float(os.environ.get("SCRAPER_TIMEOUT_SECONDS", "12"))
MAX_PAGES = int(os.environ.get("SCRAPER_MAX_PAGES_PER_SITE", "5"))
GUESS_GENERIC_EMAILS = os.environ.get("SCRAPER_GUESS_GENERIC_EMAILS", "true").lower() == "true"

STANDARD_GUESS_PREFIXES = ["info", "contact", "hello", "sales"]


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

        # Update company domain & website if discovered via LinkedIn
        if profile.discovered_domain:
            company.domain = profile.discovered_domain
        if profile.discovered_website:
            company.website = profile.discovered_website
        if profile.social_links.get("linkedin") and not company.linkedin_url:
            company.linkedin_url = profile.social_links.get("linkedin")

        email_objects: List[CompanyEmail] = []
        for e in profile.emails:
            email_objects.append(
                CompanyEmail(
                    email=e,
                    email_of=determine_email_role(e),
                    source="scraped",
                )
            )

        # If zero emails were scraped, optionally generate standard generic guesses to verify with Reacher
        if not email_objects and GUESS_GENERIC_EMAILS and profile.fetch_ok:
            for prefix in STANDARD_GUESS_PREFIXES:
                guessed_addr = f"{prefix}@{company.domain}"
                email_objects.append(
                    CompanyEmail(
                        email=guessed_addr,
                        email_of="Generic" if prefix != "sales" else "Sales",
                        source="guessed",
                    )
                )

        company.emails = email_objects
        return company


async def scrape_companies_node(state: GraphState) -> Dict[str, Any]:
    """Node that scrapes websites of discovered companies to extract about and contact info."""
    searched_companies = state.get("searched_companies", [])
    if not searched_companies:
        return {
            "scraped_companies": [],
            "pipeline_stats": {"scraped_success": 0, "scrape_failed": 0},
        }

    print(f"\n========================================================")
    print(f"[PHASE 3: WEB SCRAPER] Crawling {len(searched_companies)} candidate websites (concurrency: {SCRAPER_CONCURRENCY})...")
    print(f"========================================================")

    semaphore = asyncio.Semaphore(SCRAPER_CONCURRENCY)
    scraped_results: List[Company] = []
    scrape_failed = 0

    async with httpx.AsyncClient(verify=False) as http_client:
        tasks = [
            scrape_single_company(http_client, comp, semaphore)
            for comp in searched_companies
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for res in results:
            if isinstance(res, Company):
                if res.scraped and res.scraped.fetch_ok:
                    scraped_results.append(res)
                    emails_preview = [f"{e.email} ({e.source})" for e in res.emails]
                    print(f"  [SCRAPED OK] {res.name} ({res.domain})")
                    print(f"    Pages visited: {res.scraped.pages_visited}")
                    print(f"    Title: '{res.scraped.title}'")
                    if res.scraped.meta_description:
                        print(f"    Meta Description: '{res.scraped.meta_description[:150]}...'")
                    print(f"    About text sample ({len(res.scraped.about_text)} chars total):")
                    print(f"      \"{res.scraped.about_text[:250]}...\"")
                    print(f"    Emails found ({len(res.emails)}): {', '.join(emails_preview) if emails_preview else 'None'}")
                    if res.scraped.phones:
                        print(f"    Phones: {res.scraped.phones}")
                    if res.scraped.services_offered:
                        print(f"    Services Offered: {res.scraped.services_offered}")
                    if res.scraped.digital_features:
                        print(f"    Digital Features/Gaps: {res.scraped.digital_features}")
                    if res.scraped.social_links:
                        print(f"    Socials: {res.scraped.social_links}")
                else:
                    scrape_failed += 1
                    print(f"  [SCRAPE FAILED] {res.name} ({res.domain}) - site unreachable or timed out")
            else:
                scrape_failed += 1
                print(f"  [SCRAPE ERROR] Exception during scrape: {str(res)}")

    print(f"[PHASE 3: WEB SCRAPER] Summary: {len(scraped_results)} successfully scraped, {scrape_failed} failed.")

    return {
        "scraped_companies": scraped_results,
        "pipeline_stats": {
            "scraped_success": len(scraped_results),
            "scrape_failed": scrape_failed,
        },
    }
