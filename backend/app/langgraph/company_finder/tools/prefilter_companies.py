"""LangGraph node for deterministic pre-filtering of scraped companies."""

import re
from typing import Any, Dict, List

from ..state.state import GraphState
from app.models.company import Company
from app.services.domain_filters import count_agency_keyword_hits

PARKED_DOMAIN_PATTERNS = [
    re.compile(r"domain (for sale|is parked|expired)", re.IGNORECASE),
    re.compile(r"(buy|purchase) this domain", re.IGNORECASE),
    re.compile(r"website (under construction|coming soon)", re.IGNORECASE),
    re.compile(r"parked by (godaddy|namecheap|sedo)", re.IGNORECASE),
]


def is_parked_or_empty(text: str, email_count: int) -> bool:
    """Check if the website is a parked domain or empty placeholder."""
    for pat in PARKED_DOMAIN_PATTERNS:
        if pat.search(text):
            return True
    if len(text.strip()) < 60 and email_count == 0:
        return True
    return False


async def prefilter_companies_node(state: GraphState) -> Dict[str, Any]:
    """Pre-filter companies to remove obvious dev agencies, directories, and parked domains before email verification."""
    scraped_companies = state.get("scraped_companies", [])
    survivors: List[Company] = []
    dropped_count = 0
    agency_dropped = 0
    parked_dropped = 0

    print(f"\n========================================================")
    print(f"[PHASE 4: PRE-FILTER] Evaluating {len(scraped_companies)} scraped companies...")
    print(f"========================================================")

    for company in scraped_companies:
        scraped = company.scraped
        combined_text = " ".join([
            company.name or "",
            scraped.title if scraped else "",
            scraped.meta_description if scraped else "",
            scraped.about_text if scraped else "",
        ])

        # 1. Agency / Dev-shop heuristic check
        agency_hits = count_agency_keyword_hits(combined_text)
        if agency_hits >= 2:
            dropped_count += 1
            agency_dropped += 1
            print(f"  [PREFILTER DROPPED] {company.name} ({company.domain}) -> Dev-shop/Agency keywords detected ({agency_hits} hits)")
            continue

        # 2. Parked or placeholder domain check
        if is_parked_or_empty(combined_text, len(company.emails)):
            dropped_count += 1
            parked_dropped += 1
            print(f"  [PREFILTER DROPPED] {company.name} ({company.domain}) -> Parked, under construction, or empty placeholder")
            continue

        survivors.append(company)
        print(f"  [PREFILTER PASSED] {company.name} ({company.domain})")

    print(f"[PHASE 4: PRE-FILTER] Summary: {len(survivors)} passed, {dropped_count} dropped (agencies: {agency_dropped}, parked: {parked_dropped}).")

    return {
        "scraped_companies": survivors,
        "pipeline_stats": {
            "prefilter_dropped": dropped_count,
            "prefilter_agency_dropped": agency_dropped,
            "prefilter_parked_dropped": parked_dropped,
        },
    }
