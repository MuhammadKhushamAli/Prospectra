"""LangGraph node for deterministic pre-filtering of scraped companies."""

from typing import Any, Dict, List

from app.core.logging_config import get_node_logger
from app.langgraph.company_finder.state.state import GraphState
from app.langgraph.company_finder.tools.helpers.prefilter_helpers import is_parked_or_empty
from app.langgraph.company_finder.tools.store_search_progress import update_search_page_progress
from app.models.company import Company
from app.services.domain_filters import count_agency_keyword_hits
from app.utils.constants.prospecting_constants import PARKED_DOMAIN_PATTERNS

logger = get_node_logger("prefilter_companies")


async def prefilter_companies_node(state: GraphState) -> Dict[str, Any]:
    """Pre-filter companies to remove obvious dev agencies, directories, and parked domains before email verification."""
    scraped_companies = state.get("scraped_companies", [])
    survivors: List[Company] = []
    dropped_count = 0
    agency_dropped = 0
    parked_dropped = 0

    for company in scraped_companies:
        scraped = company.scraped
        combined_text = " ".join(
            [
                company.name or "",
                scraped.title if scraped else "",
                scraped.meta_description if scraped else "",
                scraped.about_text if scraped else "",
            ]
        )

        agency_hits = count_agency_keyword_hits(combined_text)
        if agency_hits >= 2:
            dropped_count += 1
            agency_dropped += 1
            continue

        if is_parked_or_empty(combined_text, len(company.emails)):
            dropped_count += 1
            parked_dropped += 1
            continue

        survivors.append(company)

    logger.info(
        f"[PRE-FILTER] Evaluated {len(scraped_companies)} companies: "
        f"{len(survivors)} passed, {dropped_count} dropped (agencies: {agency_dropped}, parked/empty: {parked_dropped})."
    )

    if not survivors:
        await update_search_page_progress(state, success_count=0)

    return {
        "scraped_companies": survivors,
        "pipeline_stats": {
            "prefilter_dropped": dropped_count,
            "prefilter_agency_dropped": agency_dropped,
            "prefilter_parked_dropped": parked_dropped,
        },
    }


__all__ = [
    "PARKED_DOMAIN_PATTERNS",
    "is_parked_or_empty",
    "prefilter_companies_node",
]
