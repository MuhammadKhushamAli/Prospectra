"""Tools and sub-routines for searching candidate companies via SearXNG."""

import asyncio
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

import httpx

from ..state.state import GraphState
from app.models.company import Company
from app.models.search_progress import SearchProgress, SearchProgressSource
from app.services.domain_filters import (
    extract_company_info_from_url,
    extract_registered_domain,
    is_blocked_url,
    is_job_posting,
    is_listicle_title,
)
from app.services.searxng import search_searxng
from app.core.logging_config import get_node_logger
from app.langgraph.company_finder.tools.store_search_progress import (
    MIN_SEARCH_ACCEPT_RATE,
    PAGES_PER_QUERY,
    store_search_progress,
    update_search_page_progress,
)
from app.services.supabase import get_supabase_client

SEARCH_PROGRESS_TABLE = os.environ.get("SUPABASE_SEARCH_PROGRESS_TABLE_NAME", "search_progress")
COMPANIES_TABLE = os.environ.get("SUPABASE_COMPANIES_TABLE_NAME", "companies")
MAX_CANDIDATES = int(os.environ.get("SEARXNG_MAX_CANDIDATES", "40"))
logger = get_node_logger("company_search")


def is_valid_uuid(val: Any) -> bool:
    """Validate whether a value is a valid UUID."""
    if not val or not isinstance(val, (str, uuid.UUID)):
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def clean_company_name(title: str, domain: str) -> str:
    """Extract clean company name from page title or domain."""
    if not title:
        parts = domain.split(".")
        return parts[0].capitalize()

    # Common separators in page titles: "Acme Dental | Family Care in Austin"
    delimiters = [r"\s*\|\s*", r"\s*–\s*", r"\s*-\s*", r"\s*:\s*", r"\s*—\s*"]
    split_pattern = "|".join(delimiters)
    segments = [s.strip() for s in re.split(split_pattern, title) if s.strip()]

    domain_core = domain.split(".")[0].lower()
    for seg in segments:
        clean_seg = re.sub(r"[^a-zA-Z0-9\s]", "", seg).lower()
        if domain_core in clean_seg or any(w in clean_seg for w in domain_core.split("-")):
            return seg[:60]

    # Return shortest segment if none directly matched domain
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
    except Exception as e:
        logger.warning(f"Warning: Failed to fetch SearXNG search progress: {str(e)}")

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
    except Exception as e:
        logger.warning(f"Warning: Failed to check existing company domains: {str(e)}")
        return set()


async def search_companies_node(state: GraphState) -> Dict[str, Any]:
    """Node that executes SearXNG searches and outputs deduplicated Company objects."""
    search_prompt = state.get("search_prompt")
    user_context = state.get("user_context")
    if not search_prompt or not search_prompt.searxng:
        raise ValueError("SearXNG search prompt is missing from state.")

    org_id = (
        getattr(user_context, "org_id", "")
        if user_context and not isinstance(user_context, dict)
        else (user_context or {}).get("org_id", "")
    )

    user_id = (
        getattr(user_context, "user_id", "")
        if user_context and not isinstance(user_context, dict)
        else (user_context or {}).get("user_id", "")
    )

    queries = search_prompt.searxng.queries
    seen_domains: Set[str] = set(state.get("seen_domains", []))
    errors: List[str] = list(state.get("errors", []))

    supabase = await get_supabase_client()
    last_page = await fetch_last_search_page(supabase, str(org_id), str(user_id))
    start_page = max(1, last_page + 1)

    logger.banner(f"[PHASE 2: SEARXNG SEARCH] Executing {len(queries)} queries across {PAGES_PER_QUERY} pages (start_page: {start_page})")

    searxng_tasks = []
    async with httpx.AsyncClient() as http_client:
        for q in queries:
            for p in range(start_page, start_page + PAGES_PER_QUERY):
                searxng_tasks.append((q, p, search_searxng(http_client, q.query, page=p)))

        # Gather results with error resilience
        raw_results = await asyncio.gather(
            *[t[2] for t in searxng_tasks],
            return_exceptions=True,
        )

    candidate_results: List[Tuple[Any, Dict[str, Any]]] = []
    for idx, res in enumerate(raw_results):
        if isinstance(res, Exception):
            err_msg = f"SearXNG query error: {str(res)}"
            logger.error(f"  [ERROR] {err_msg}")
            if err_msg not in errors:
                errors.append(err_msg)
            continue
        query_obj = searxng_tasks[idx][0]
        page_num = searxng_tasks[idx][1]
        logger.info(f"  SearXNG query [{query_obj.target_industry}] (page {page_num}) -> {len(res)} raw results")
        for item in res:
            candidate_results.append((query_obj, item))
            # Log incoming item data sample
            if len(candidate_results) <= 5 or len(candidate_results) % 10 == 0:
                logger.item(f"Incoming result: Title='{item.get('title', '')[:50]}' | URL={item.get('url', '')}")
                if item.get("content"):
                    logger.item(f"   Snippet: {item.get('content')[:120]}...")

    # Process and filter candidates
    discovered_companies: List[Company] = []
    unique_domains_in_batch: Dict[str, Tuple[Any, Dict[str, Any], str, Optional[str]]] = {}
    blocked_count = 0
    jobs_count = 0

    for query_obj, item in candidate_results:
        url = item.get("url", "")
        title = item.get("title", "")
        snippet = item.get("content", "")

        # 1. Strictly reject job postings, openings, and hiring vacancy listings
        if is_job_posting(title=title, url=url, snippet=snippet):
            jobs_count += 1
            logger.error(f"  [JOB REJECTED] Discarding job vacancy: '{title[:55]}' | URL={url}")
            continue

        # 2. Block general directories, search engines, job boards, and listicles
        if not url or is_blocked_url(url) or is_listicle_title(title):
            blocked_count += 1
            continue

        # 3. Extract distinct registered domain / platform company info
        domain, website, linkedin_url = extract_company_info_from_url(url, title, snippet)
        if not domain or domain in seen_domains:
            continue

        if domain not in unique_domains_in_batch:
            unique_domains_in_batch[domain] = (query_obj, item, website, linkedin_url)

    # Check for existing companies in DB
    batch_domains = list(unique_domains_in_batch.keys())
    existing_db_domains = await fetch_existing_org_domains(supabase, str(org_id), batch_domains)
    if existing_db_domains:
        logger.info(f"  [DB DEDUP] Skipping {len(existing_db_domains)} already existing domain(s) in DB: {list(existing_db_domains)[:5]}...")

    for domain, (query_obj, item, website, linkedin_url) in unique_domains_in_batch.items():
        if domain in existing_db_domains:
            continue

        url = item.get("url", "")
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

    logger.header(f"\n[PHASE 2: SEARXNG SEARCH] Summary:")
    logger.item(f"Raw hits received: {len(candidate_results)}")
    logger.item(f"Jobs rejected: {jobs_count}")
    logger.item(f"Blocked (directory/listicle/job board): {blocked_count}")
    logger.item(f"DB duplicates skipped: {len(existing_db_domains)}")
    logger.item(f"Unique new candidate companies: {len(discovered_companies)}")
    for idx, c in enumerate(discovered_companies, 1):
        logger.item(f"  [{idx}] Name: {c.name}")
        logger.item(f"      Domain: {c.domain} | URL: {c.website} | LinkedIn: {c.linkedin_url} | Industry: {c.industry}")
        logger.item(f"      Search Snippet: {c.search_snippet[:120]}...")

    target_last_page = start_page + PAGES_PER_QUERY - 1

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
