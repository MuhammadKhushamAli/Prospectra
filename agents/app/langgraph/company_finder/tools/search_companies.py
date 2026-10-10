"""LangGraph node for searching companies via Apollo and Tavily."""

import uuid
from typing import Any, Dict, List

from ..state.state import GraphState
from app.models.company import Company
from app.models.search_progress import SearchProgress
from datetime import datetime
from app.services.apollo_companies import find_apollo_companies
from app.services.tavily import search_tavily


import asyncio
import os
from supabase import create_client
from app.langgraph.company_finder.tools.store_search_progress import store_search_progress

def get_supabase_client():
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")
    return create_client(url, key)

async def search_companies_node(state: GraphState) -> Dict[str, Any]:
    """Node that executes Apollo and Tavily searches and parses results into Company objects."""
    search_prompt = state.get("search_prompt")
    user_context = state.get("user_context")
    if not search_prompt:
        raise ValueError("search_prompt is missing from the state.")

    org_id = getattr(user_context, "org_id", "") if user_context and not isinstance(user_context, dict) else (user_context or {}).get("org_id", "")

    apollo_prompt = search_prompt.apollo
    tavily_prompt = search_prompt.tavily
    
    searched_companies: List[Company] = []
    search_progress: List[SearchProgress] = []
    errors: List[str] = state.get("errors", [])
    
    skill_target_id = state.get("skill_target_id", "")

    last_page_apollo = 0
    last_page_tavily = 0
    
    if org_id and skill_target_id:
        try:
            supabase = get_supabase_client()
            response = supabase.table("search_progress").select("source, last_page_fetched").eq("org_id", org_id).eq("skill_target_id", skill_target_id).execute()
            for record in response.data:
                if record.get("source") == "apollo":
                    last_page_apollo = record.get("last_page_fetched", 0)
                elif record.get("source") == "tavily":
                    last_page_tavily = record.get("last_page_fetched", 0)
        except Exception as e:
            errors.append(f"Failed to fetch search progress: {str(e)}")

    # 1. Call Apollo API
    if apollo_prompt:
        try:
            company_id = uuid.uuid4()

            current_apollo_page = last_page_apollo + 1
            apollo_prompt.page = current_apollo_page
            
            data = await find_apollo_companies(apollo_prompt)
            organizations = data.get("organizations", [])
            
            for org in organizations:
                company = Company(
                    id=company_id,
                    org_id=org_id,
                    name=org.get("name", "Unknown"),
                    domain=org.get("primary_domain", ""),
                    website=org.get("website_url"),
                    linkedin_url=org.get("linkedin_url"),
                    industry=org.get("industry", ""),
                    size=str(org.get("estimated_num_employees", "")) if org.get("estimated_num_employees") else "",
                    source="apollo",
                    raw_signals=org,
                )
                searched_companies.append(company)
                
            search_progress.append(
                SearchProgress(
                    org_id=org_id,
                    skill_target_id=skill_target_id,
                    last_page_fetched=current_apollo_page,
                    last_fetched_at=datetime.utcnow(),
                    source="apollo"
                )
            )
        except Exception as e:
            errors.append(f"Apollo API error: {str(e)}")

    # 2. Call Tavily API
    if tavily_prompt:
        try:
            company_id = uuid.uuid4()

            current_tavily_page = last_page_tavily + 1
            
            data = await search_tavily(tavily_prompt)
            results = data.get("results", [])
            
            for res in results:
                company = Company(
                    id=company_id,
                    org_id=org_id,
                    name=res.get("title", "Unknown"),
                    domain=res.get("url", ""),
                    website=res.get("url"),
                    industry="",
                    size="",
                    source="tavily",
                    raw_signals=res,
                )
                searched_companies.append(company)
                
            search_progress.append(
                SearchProgress(
                    org_id=org_id,
                    skill_target_id=skill_target_id,
                    last_page_fetched=current_tavily_page,
                    last_fetched_at=datetime.utcnow(),
                    source="tavily"
                )
            )
        except Exception as e:
            errors.append(f"Tavily API error: {str(e)}")
            
    if search_progress:
        asyncio.create_task(store_search_progress(search_progress))
            
    return {
        "searched_companies": searched_companies,
        "errors": errors
    }
