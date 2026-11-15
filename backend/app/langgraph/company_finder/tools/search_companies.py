"""LangGraph node for searching candidate companies via SearXNG."""

import asyncio
from typing import Any, Dict, List, Set, Tuple

import httpx

from app.core.logging_config import get_node_logger
from app.langgraph.company_finder.state.state import GraphState
from app.langgraph.company_finder.tools.helpers.search_node_helpers import (
    build_discovered_companies_from_batch,
    clean_company_name,
    collect_unique_candidate_domains,
    fetch_existing_org_domains,
    fetch_last_search_page,
)
from app.services.searxng import search_searxng
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import COMPANIES_TABLE, SEARCH_PROGRESS_TABLE
from app.utils.constants.prospecting_constants import (
    MAX_CANDIDATES,
    MIN_SEARCH_ACCEPT_RATE,
    PAGES_PER_QUERY,
)
from app.utils.helpers.state_helpers import extract_org_and_user_from_state
from app.utils.helpers.uuid_helpers import is_valid_uuid

logger = get_node_logger("company_search")


async def search_companies_node(state: GraphState) -> Dict[str, Any]:
    """Node that executes SearXNG searches and outputs deduplicated Company objects."""
    search_prompt = state.get("search_prompt")
    if not search_prompt or not search_prompt.searxng:
        raise ValueError("SearXNG search prompt is missing from state.")

    org_id, user_id = extract_org_and_user_from_state(state)
    queries = search_prompt.searxng.queries
    seen_domains: Set[str] = set(state.get("seen_domains", []))
    errors: List[str] = list(state.get("errors", []))

    supabase = await get_supabase_client()
    last_page = await fetch_last_search_page(supabase, org_id, user_id)
    start_page = max(1, last_page + 1)
    target_last_page = start_page + PAGES_PER_QUERY - 1

    searxng_tasks = []
    async with httpx.AsyncClient() as http_client:
        for q in queries:
            for p in range(start_page, start_page + PAGES_PER_QUERY):
                searxng_tasks.append((q, p, search_searxng(http_client, q.query, page=p)))

        raw_results = await asyncio.gather(
            *[t[2] for t in searxng_tasks],
            return_exceptions=True,
        )

    candidate_results: List[Tuple[Any, Dict[str, Any]]] = []
    page_counts: Dict[int, int] = {}
    for idx, res in enumerate(raw_results):
        if isinstance(res, Exception):
            err_msg = f"SearXNG query error: {str(res)}"
            if err_msg not in errors:
                errors.append(err_msg)
            continue
        query_obj = searxng_tasks[idx][0]
        page_num = searxng_tasks[idx][1]
        page_counts[page_num] = page_counts.get(page_num, 0) + len(res)
        for item in res:
            candidate_results.append((query_obj, item))

    for p_num, p_count in sorted(page_counts.items()):
        logger.info(f"[SEARXNG SEARCH] Page {p_num}: {p_count} raw results fetched across {len(queries)} query(ies).")

    unique_domains_in_batch, jobs_count, blocked_count = collect_unique_candidate_domains(
        candidate_results,
        seen_domains,
    )

    batch_domains = list(unique_domains_in_batch.keys())
    existing_db_domains = await fetch_existing_org_domains(supabase, org_id, batch_domains)

    discovered_companies = build_discovered_companies_from_batch(
        unique_domains_in_batch=unique_domains_in_batch,
        existing_db_domains=existing_db_domains,
        seen_domains=seen_domains,
        org_id=org_id,
    )

    logger.info(
        f"[SEARXNG SEARCH] Pages {start_page}..{target_last_page}: "
        f"{len(discovered_companies)} unique companies discovered from {len(candidate_results)} raw results "
        f"(jobs rejected: {jobs_count}, blocked: {blocked_count}, DB duplicates skipped: {len(existing_db_domains)})."
    )

    return {
        "searched_companies": discovered_companies,
        "seen_domains": list(seen_domains),
        "errors": errors,
        "pipeline_stats": {
            "searched": len(candidate_results),
            "jobs_rejected": jobs_count,
            "blocked": blocked_count,
            "db_duplicates": len(existing_db_domains),
            "start_page": start_page,
            "target_last_page": target_last_page,
        },
    }


__all__ = [
    "SEARCH_PROGRESS_TABLE",
    "COMPANIES_TABLE",
    "MAX_CANDIDATES",
    "MIN_SEARCH_ACCEPT_RATE",
    "PAGES_PER_QUERY",
    "is_valid_uuid",
    "clean_company_name",
    "fetch_last_search_page",
    "fetch_existing_org_domains",
    "search_companies_node",
]
