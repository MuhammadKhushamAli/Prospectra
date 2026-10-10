"""LangGraph node for searching companies via Apollo and Tavily."""

from typing import Any, Dict, List

from app.langgraph.state.state import GraphState
from app.models.company import Company
from app.services.apollo_companies import find_apollo_companies
from app.services.tavily import search_tavily


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
    errors: List[str] = state.get("errors", [])

    # 1. Call Apollo API
    if apollo_prompt:
        try:
            data = await find_apollo_companies(apollo_prompt)
            organizations = data.get("organizations", [])
            
            for org in organizations:
                company = Company(
                    id=org.get("id", ""),
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
        except Exception as e:
            errors.append(f"Apollo API error: {str(e)}")

    # 2. Call Tavily API
    if tavily_prompt:
        try:
            data = await search_tavily(tavily_prompt)
            results = data.get("results", [])
            
            for res in results:
                company = Company(
                    id="",
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
        except Exception as e:
            errors.append(f"Tavily API error: {str(e)}")
            
    return {
        "searched_companies": searched_companies,
        "errors": errors
    }
