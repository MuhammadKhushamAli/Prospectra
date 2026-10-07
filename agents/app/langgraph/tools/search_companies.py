"""LangGraph node for searching companies via Apollo and Tavily."""

from typing import Any, Dict, List

from app.langgraph.state.state import GraphState
from app.models.company import Company
from app.services.apollo_companies import find_apollo_companies
from app.services.tavily import search_tavily


def search_companies_node(state: GraphState) -> Dict[str, Any]:
    """Node that executes Apollo and Tavily searches and parses results into Company objects."""
    search_prompt = state.get("search_prompt")
    if not search_prompt:
        raise ValueError("search_prompt is missing from the state.")

    apollo_prompt = search_prompt.apollo
    tavily_prompt = search_prompt.tavily
    
    searched_companies: List[Company] = []
    errors: List[str] = state.get("errors", [])

    # 1. Call Apollo API
    if apollo_prompt:
        try:
            data = find_apollo_companies(apollo_prompt)
            organizations = data.get("organizations", [])
            
            for org in organizations:
                company = Company(
                    name=org.get("name", "Unknown"),
                    web=org.get("website_url"),
                    linkedin_url=org.get("linkedin_url"),
                    location=org.get("primary_phone", {}).get("sanitized_number") if org.get("primary_phone") else None,
                )
                searched_companies.append(company)
        except Exception as e:
            errors.append(f"Apollo API error: {str(e)}")

    # 2. Call Tavily API
    if tavily_prompt:
        try:
            data = search_tavily(tavily_prompt)
            results = data.get("results", [])
            
            for res in results:
                company = Company(
                    name=res.get("title", "Unknown"),
                    web=res.get("url"),
                    description=res.get("content")
                )
                searched_companies.append(company)
        except Exception as e:
            errors.append(f"Tavily API error: {str(e)}")
            
    return {
        "searched_companies": searched_companies,
        "errors": errors
    }
