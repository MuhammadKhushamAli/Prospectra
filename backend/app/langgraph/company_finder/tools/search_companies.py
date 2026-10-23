import asyncio
from datetime import datetime
import os
from urllib.parse import urlparse
import uuid
from typing import Any, Dict, List

from ..state.state import GraphState
from app.models.company import Company
from app.models.search_progress import SearchProgress
from app.services.apollo_companies import find_apollo_companies
from app.services.tavily import filter_and_clean_tavily_results, search_tavily
from app.langgraph.company_finder.tools.store_search_progress import store_search_progress
from app.services.supabase import get_supabase_client

SEARCH_PROGRESS_TABLE = os.environ.get("SUPABASE_SEARCH_PROGRESS_TABLE_NAME", "search_progress")


def is_valid_uuid(val: Any) -> bool:
    if not val or not isinstance(val, (str, uuid.UUID)):
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


async def _ensure_skill_target_id(supabase: Any, org_id: str, user_context: Any) -> str:
    """Ensure an active skill_target exists for the organization so foreign keys are satisfied."""
    try:
        res = await (
            supabase.table("skill_targets")
            .select("id")
            .eq("org_id", str(org_id))
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return res.data[0]["id"]

        skills: List[str] = []
        if user_context:
            skills_data = getattr(user_context, "skills", None)
            if skills_data is None and isinstance(user_context, dict):
                skills_data = user_context.get("skills")
            if skills_data:
                for s in skills_data:
                    name = getattr(s, "name", None) or (s.get("name") if isinstance(s, dict) else None)
                    if name:
                        skills.append(name)

        new_res = await (
            supabase.table("skill_targets")
            .insert({
                "org_id": str(org_id),
                "target_profile": f"Target profiles for {', '.join(skills[:3])}" if skills else "Default Target Profile",
                "search_keywords": skills,
                "is_active": True,
            })
            .execute()
        )
        if new_res.data and len(new_res.data) > 0:
            return new_res.data[0]["id"]
    except Exception as e:
        print(f"Warning: Failed to ensure skill_target for org {org_id}: {str(e)}")
    return ""


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

    apollo_prompt = search_prompt.apollo
    tavily_prompt = search_prompt.tavily

    searched_companies: List[Company] = []
    search_progress: List[SearchProgress] = []
    errors: List[str] = state.get("errors", [])

    supabase = await get_supabase_client()

    skill_target_id = state.get("skill_target_id", "")
    if not is_valid_uuid(skill_target_id) and is_valid_uuid(org_id):
        skill_target_id = await _ensure_skill_target_id(supabase, str(org_id), user_context)

    can_track_progress = is_valid_uuid(org_id) and is_valid_uuid(skill_target_id)
    last_page_apollo = 0
    last_page_tavily = 0

    if can_track_progress:
        try:
            response = await (
                supabase.table(SEARCH_PROGRESS_TABLE)
                .select("source, last_page_fetched")
                .eq("org_id", str(org_id))
                .eq("skill_target_id", str(skill_target_id))
                .execute()
            )
            for record in response.data or []:
                if record.get("source") == "apollo":
                    last_page_apollo = record.get("last_page_fetched", 0)
                elif record.get("source") == "tavily":
                    last_page_tavily = record.get("last_page_fetched", 0)
        except Exception as e:
            errors.append(f"Failed to fetch search progress: {str(e)}")

    # 1. Call Apollo API
    if apollo_prompt:
        try:
            current_apollo_page = last_page_apollo + 1
            apollo_prompt.page = current_apollo_page

            data = await find_apollo_companies(apollo_prompt)
            organizations = data.get("organizations", [])

            for org in organizations:
                raw_domain = org.get("primary_domain") or ""
                website_url = org.get("website_url") or ""
                company = Company(
                    id=str(uuid.uuid4()),
                    org_id=str(org_id),
                    name=org.get("name", "Unknown"),
                    domain=raw_domain.lower() if raw_domain else "",
                    website=website_url if website_url else (f"https://{raw_domain}" if raw_domain else None),
                    linkedin_url=org.get("linkedin_url"),
                    industry=org.get("industry", ""),
                    size=str(org.get("estimated_num_employees", "")) if org.get("estimated_num_employees") else "",
                    source="apollo",
                    raw_signals=org,
                )
                searched_companies.append(company)

            if can_track_progress:
                search_progress.append(
                    SearchProgress(
                        org_id=str(org_id),
                        skill_target_id=str(skill_target_id),
                        last_page_fetched=current_apollo_page,
                        last_fetched_at=datetime.utcnow(),
                        source="apollo",
                    )
                )
        except Exception as e:
            errors.append(f"Apollo API error: {str(e)}")
            print(f"Apollo API error: {str(e)}")

    # 2. Call Tavily API
    if tavily_prompt:
        try:
            current_tavily_page = last_page_tavily + 1

            data = await search_tavily(tavily_prompt)
            results = data.get("results", [])
            cleaned_companies = filter_and_clean_tavily_results(results)

            for item in cleaned_companies:
                company = Company(
                    id=str(uuid.uuid4()),
                    org_id=str(org_id),
                    name=item["name"],
                    domain=item["domain"],
                    website=item["website"],
                    industry="",
                    size="",
                    source="tavily",
                    raw_signals=item["raw_signals"],
                )
                searched_companies.append(company)

            if can_track_progress:
                search_progress.append(
                    SearchProgress(
                        org_id=str(org_id),
                        skill_target_id=str(skill_target_id),
                        last_page_fetched=current_tavily_page,
                        last_fetched_at=datetime.utcnow(),
                        source="tavily",
                    )
                )
        except Exception as e:
            errors.append(f"Tavily API error: {str(e)}")
            print(f"Tavily API error: {str(e)}")

    # Persist progress to Supabase and await completion
    if search_progress:
        await store_search_progress(search_progress)

    return {
        "searched_companies": searched_companies,
        "skill_target_id": skill_target_id,
        "errors": errors,
    }

