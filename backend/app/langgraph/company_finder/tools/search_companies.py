"""Tools and sub-routines for searching target companies via Apollo and Tavily."""

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from ..state.state import GraphState
from app.models.company import Company
from app.models.search_progress import SearchProgress, SearchProgressSource
from app.services.apollo_companies import find_apollo_companies
from app.services.tavily import filter_and_clean_tavily_results, search_tavily
from app.langgraph.company_finder.tools.store_search_progress import store_search_progress
from app.services.supabase import get_supabase_client

SEARCH_PROGRESS_TABLE = os.environ.get("SUPABASE_SEARCH_PROGRESS_TABLE_NAME", "search_progress")


def is_valid_uuid(val: Any) -> bool:
    """Validate whether a value is a non-empty, valid UUID string or UUID object."""
    if not val or not isinstance(val, (str, uuid.UUID)):
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def extract_user_skill_ids(user_context: Any) -> List[str]:
    """Extract a list of valid skill UUID strings from the user context."""
    skill_ids: List[str] = []
    if not user_context:
        return skill_ids

    skills_data = getattr(user_context, "skills", None)
    if skills_data is None and isinstance(user_context, dict):
        skills_data = user_context.get("skills")

    if skills_data:
        for s in skills_data:
            sid = getattr(s, "id", None) or (s.get("id") if isinstance(s, dict) else None)
            if sid and is_valid_uuid(sid):
                skill_ids.append(str(sid))

    return skill_ids


async def fetch_last_search_pages(
    supabase: Any,
    org_id: str,
    user_id: Optional[str] = None,
) -> Tuple[int, int]:
    """Query search_progress to retrieve the last fetched page numbers for Apollo and Tavily."""
    last_page_apollo = 0
    last_page_tavily = 0

    if not is_valid_uuid(org_id):
        return last_page_apollo, last_page_tavily

    try:
        query = (
            supabase.table(SEARCH_PROGRESS_TABLE)
            .select("source, last_page_fetched")
            .eq("org_id", str(org_id))
        )
        if user_id and is_valid_uuid(user_id):
            query = query.eq("user_id", str(user_id))

        response = await query.execute()

        for record in response.data or []:
            src = record.get("source")
            page_val = record.get("last_page_fetched", 0)
            if src == SearchProgressSource.APOLLO.value:
                last_page_apollo = page_val
            elif src == SearchProgressSource.TAVILY.value:
                last_page_tavily = page_val
    except Exception as e:
        print(f"Warning: Failed to fetch search progress: {str(e)}")

    return last_page_apollo, last_page_tavily


def parse_apollo_company(org: Dict[str, Any], org_id: str) -> Company:
    """Map a raw Apollo organization result to a domain Company object."""
    raw_domain = org.get("primary_domain") or ""
    website_url = org.get("website_url") or ""

    return Company(
        id=str(uuid.uuid4()),
        org_id=str(org_id),
        name=org.get("name", "Unknown"),
        domain=raw_domain.lower() if raw_domain else "",
        website=website_url if website_url else (f"https://{raw_domain}" if raw_domain else None),
        linkedin_url=org.get("linkedin_url"),
        industry=org.get("industry", ""),
        size=str(org.get("estimated_num_employees", "")) if org.get("estimated_num_employees") else "",
        source=SearchProgressSource.APOLLO.value,
        raw_signals=org,
    )


async def execute_apollo_search(
    apollo_prompt: Any,
    org_id: str,
    user_id: Optional[str],
    last_page: int,
    skill_ids: List[str],
) -> Tuple[List[Company], Optional[SearchProgress], Optional[str]]:
    """Execute search against Apollo API and return discovered companies and progress."""
    companies: List[Company] = []
    progress: Optional[SearchProgress] = None
    error: Optional[str] = None

    try:
        current_page = last_page + 1
        apollo_prompt.page = current_page

        data = await find_apollo_companies(apollo_prompt)
        organizations = data.get("organizations", [])

        for org in organizations:
            companies.append(parse_apollo_company(org, org_id))

        progress = SearchProgress(
            user_id=str(user_id) if is_valid_uuid(user_id) else None,
            org_id=str(org_id),
            last_page_fetched=current_page,
            last_fetched_at=datetime.now(timezone.utc),
            source=SearchProgressSource.APOLLO,
            skill_ids=skill_ids,
        )
    except Exception as e:
        error = f"Apollo API error: {str(e)}"
        print(error)

    return companies, progress, error


def parse_tavily_company(item: Dict[str, Any], org_id: str) -> Company:
    """Map a cleaned Tavily result item to a domain Company object."""
    return Company(
        id=str(uuid.uuid4()),
        org_id=str(org_id),
        name=item.get("name", "Unknown"),
        domain=item.get("domain", ""),
        website=item.get("website"),
        industry="",
        size="",
        source=SearchProgressSource.TAVILY.value,
        raw_signals=item.get("raw_signals"),
    )


async def execute_tavily_search(
    tavily_prompt: Any,
    org_id: str,
    user_id: Optional[str],
    last_page: int,
    skill_ids: List[str],
) -> Tuple[List[Company], Optional[SearchProgress], Optional[str]]:
    """Execute search against Tavily API and return discovered companies and progress."""
    companies: List[Company] = []
    progress: Optional[SearchProgress] = None
    error: Optional[str] = None

    try:
        current_page = last_page + 1

        data = await search_tavily(tavily_prompt)
        results = data.get("results", [])
        cleaned_companies = filter_and_clean_tavily_results(results)

        for item in cleaned_companies:
            companies.append(parse_tavily_company(item, org_id))

        progress = SearchProgress(
            user_id=str(user_id) if is_valid_uuid(user_id) else None,
            org_id=str(org_id),
            last_page_fetched=current_page,
            last_fetched_at=datetime.now(timezone.utc),
            source=SearchProgressSource.TAVILY,
            skill_ids=skill_ids,
        )
    except Exception as e:
        error = f"Tavily API error: {str(e)}"
        print(error)

    return companies, progress, error


async def search_companies_node(state: GraphState) -> Dict[str, Any]:
    """Node that executes Apollo and Tavily searches and parses results into Company objects."""
    search_prompt = state.get("search_prompt")
    user_context = state.get("user_context")
    if not search_prompt:
        raise ValueError("search_prompt is missing from the state.")

    org_id = (
        getattr(user_context, "org_id", "")
        if user_context and not isinstance(user_context, dict)
        else (user_context or {}).get("org_id", "")
    )
    if not org_id:
        org_id = state.get("org_id", "")

    user_id = (
        getattr(user_context, "user_id", "")
        if user_context and not isinstance(user_context, dict)
        else (user_context or {}).get("user_id", "")
    )
    if not user_id:
        user_id = state.get("user_id", "")

    apollo_prompt = search_prompt.apollo
    tavily_prompt = search_prompt.tavily

    searched_companies: List[Company] = []
    search_progress: List[SearchProgress] = []
    errors: List[str] = list(state.get("errors", []))

    supabase = await get_supabase_client()
    skill_ids = extract_user_skill_ids(user_context)

    # Fetch last fetched pages for tracking pagination
    last_page_apollo, last_page_tavily = await fetch_last_search_pages(supabase, str(org_id), user_id)

    # 1. Execute Apollo search
    if apollo_prompt:
        apollo_companies, apollo_progress, apollo_err = await execute_apollo_search(
            apollo_prompt=apollo_prompt,
            org_id=str(org_id),
            user_id=user_id,
            last_page=last_page_apollo,
            skill_ids=skill_ids,
        )
        searched_companies.extend(apollo_companies)
        if apollo_progress and is_valid_uuid(org_id):
            search_progress.append(apollo_progress)
        if apollo_err:
            errors.append(apollo_err)

    # 2. Execute Tavily search
    if tavily_prompt:
        tavily_companies, tavily_progress, tavily_err = await execute_tavily_search(
            tavily_prompt=tavily_prompt,
            org_id=str(org_id),
            user_id=user_id,
            last_page=last_page_tavily,
            skill_ids=skill_ids,
        )
        searched_companies.extend(tavily_companies)
        if tavily_progress and is_valid_uuid(org_id):
            search_progress.append(tavily_progress)
        if tavily_err:
            errors.append(tavily_err)

    # 3. Persist search progress in Supabase
    if search_progress:
        await store_search_progress(search_progress)

    return {
        "searched_companies": searched_companies,
        "errors": errors,
    }
