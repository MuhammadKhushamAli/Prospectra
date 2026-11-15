"""LangGraph node for scraping company websites."""

import asyncio
from typing import Any, Dict, List

import httpx

from app.core.logging_config import get_node_logger
from app.langgraph.company_finder.state.state import GraphState
from app.langgraph.company_finder.tools.helpers.scrape_node_helpers import (
    build_assumed_company_emails,
    determine_email_role,
    scrape_single_company,
)
from app.models.company import Company
from app.utils.constants.prospecting_constants import (
    GUESS_GENERIC_EMAILS,
    MAX_PAGES,
    SCRAPER_CONCURRENCY,
    SCRAPER_TIMEOUT,
    STANDARD_GUESS_PREFIXES,
)

logger = get_node_logger("scrape_companies")


async def scrape_companies_node(state: GraphState) -> Dict[str, Any]:
    """Node that scrapes websites of discovered companies to extract about and contact info."""
    searched_companies = state.get("searched_companies", [])
    if not searched_companies:
        return {
            "scraped_companies": [],
            "pipeline_stats": {"scraped_success": 0, "scrape_failed": 0},
        }

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
            if isinstance(res, Company) and res.scraped and res.scraped.fetch_ok:
                scraped_results.append(res)
            else:
                scrape_failed += 1

    total_emails = sum(len(c.emails or []) for c in scraped_results)
    logger.info(
        f"[WEB SCRAPER] Scraped {len(scraped_results)}/{len(searched_companies)} companies "
        f"(failed: {scrape_failed}, candidate emails collected: {total_emails})."
    )

    return {
        "scraped_companies": scraped_results,
        "pipeline_stats": {
            "scraped_success": len(scraped_results),
            "scrape_failed": scrape_failed,
        },
    }


__all__ = [
    "SCRAPER_CONCURRENCY",
    "SCRAPER_TIMEOUT",
    "MAX_PAGES",
    "GUESS_GENERIC_EMAILS",
    "STANDARD_GUESS_PREFIXES",
    "determine_email_role",
    "build_assumed_company_emails",
    "scrape_single_company",
    "scrape_companies_node",
]
