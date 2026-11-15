"""Helper functions for SearXNG candidate search, company name cleaning, and DB deduplication."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Set, Tuple
import uuid

from app.core.logging_config import get_node_logger
from app.models.company import Company
from app.models.search_progress import SearchProgressSource
from app.services.domain_filters import (
    extract_company_info_from_url,
    is_blocked_url,
    is_job_posting,
    is_listicle_title,
)
from app.utils.constants.db_tables import COMPANIES_TABLE, SEARCH_PROGRESS_TABLE
from app.utils.constants.prospecting_constants import MAX_CANDIDATES
from app.utils.helpers.uuid_helpers import is_valid_uuid

logger = get_node_logger("company_search")


def clean_company_name(title: str, domain: str) -> str:
    """Extract clean company name from page title or domain."""
    if not title:
        parts = domain.split(".")
        return parts[0].capitalize()

    delimiters = [r"\s*\|\s*", r"\s*–\s*", r"\s*-\s*", r"\s*:\s*", r"\s*—\s*"]
    split_pattern = "|".join(delimiters)
    segments = [s.strip() for s in re.split(split_pattern, title) if s.strip()]

    domain_core = domain.split(".")[0].lower()
    for seg in segments:
        clean_seg = re.sub(r"[^a-zA-Z0-9\s]", "", seg).lower()
        if domain_core in clean_seg or any(w in clean_seg for w in domain_core.split("-")):
            return seg[:60]

    if segments:
        return min(segments, key=len)[:60]
    return title[:60]


async def fetch_last_search_page(
    supabase: Any,
    org_id: str,
    user_id: str,
) -> int:
    """Query search_progress to retrieve last fetched page for SearXNG."""
    if not (is_valid_uuid(org_id) and is_valid_uuid(user_id)):
        return 0

    try:
        query = (
            supabase.table(SEARCH_PROGRESS_TABLE)
            .select("last_page_fetched")
            .eq("org_id", str(org_id))
            .eq("user_id", str(user_id))
            .eq("source", SearchProgressSource.SEARXNG.value)
            .limit(1)
        )
        response = await query.execute()
        if response.data and len(response.data) > 0:
            return response.data[0].get("last_page_fetched", 0)
    except Exception as exc:
        logger.warning(f"Warning: Failed to fetch SearXNG search progress: {str(exc)}")

    return 0


async def fetch_existing_org_domains(
    supabase: Any,
    org_id: str,
    domains: List[str],
) -> Set[str]:
    """Check Supabase for candidate domains already stored for this organization."""
    if not is_valid_uuid(org_id) or not domains:
        return set()

    try:
        response = (
            await supabase.table(COMPANIES_TABLE)
            .select("domain")
            .eq("org_id", str(org_id))
            .in_("domain", domains)
            .execute()
        )
        return {r["domain"].lower() for r in (response.data or []) if r.get("domain")}
    except Exception as exc:
        logger.warning(f"Warning: Failed to check existing company domains: {str(exc)}")
        return set()


def collect_unique_candidate_domains(
    candidate_results: List[Tuple[Any, Dict[str, Any]]],
    seen_domains: Set[str],
) -> Tuple[Dict[str, Tuple[Any, Dict[str, Any], str, Optional[str]]], int, int]:
    """Filter raw SearXNG results into unique candidate domains, returning (unique_map, jobs_count, blocked_count)."""
    unique_domains_in_batch: Dict[str, Tuple[Any, Dict[str, Any], str, Optional[str]]] = {}
    blocked_count = 0
    jobs_count = 0

    for query_obj, item in candidate_results:
        url = item.get("url", "")
        title = item.get("title", "")
        snippet = item.get("content", "")

        if is_job_posting(title=title, url=url, snippet=snippet):
            jobs_count += 1
            continue

        if not url or is_blocked_url(url) or is_listicle_title(title):
            blocked_count += 1
            continue

        domain, website, linkedin_url = extract_company_info_from_url(url, title, snippet)
        if not domain or domain in seen_domains:
            continue

        if domain not in unique_domains_in_batch:
            unique_domains_in_batch[domain] = (query_obj, item, website, linkedin_url)

    return unique_domains_in_batch, jobs_count, blocked_count


def build_discovered_companies_from_batch(
    unique_domains_in_batch: Dict[str, Tuple[Any, Dict[str, Any], str, Optional[str]]],
    existing_db_domains: Set[str],
    seen_domains: Set[str],
    org_id: str,
) -> List[Company]:
    """Instantiate Company objects for new domains not already in the database."""
    discovered_companies: List[Company] = []

    for domain, (query_obj, item, website, linkedin_url) in unique_domains_in_batch.items():
        if domain in existing_db_domains:
            continue

        title = item.get("title", "")
        snippet = item.get("content", "")
        company_name = clean_company_name(title, domain)

        comp = Company(
            id=str(uuid.uuid4()),
            org_id=str(org_id),
            name=company_name,
            domain=domain,
            website=website,
            linkedin_url=linkedin_url,
            industry=query_obj.target_industry,
            source=SearchProgressSource.SEARXNG.value,
            search_snippet=snippet,
            search_query=query_obj.query,
            raw_signals={
                "search_title": title,
                "search_snippet": snippet,
                "search_query": query_obj.query,
            },
        )
        discovered_companies.append(comp)
        seen_domains.add(domain)

        if len(discovered_companies) >= MAX_CANDIDATES:
            break

    return discovered_companies
