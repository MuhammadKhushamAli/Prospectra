"""LangGraph node for company authentication."""

from typing import Any, Dict

from app.agents.company_authenticator.company_auth_agent import authenticate_company
from app.langgraph.state.state import GraphState


async def authenticate_companies_node(state: GraphState) -> Dict[str, Any]:
    """Node that scores searched companies against the user's profile."""
    user_context = state.get("user_context")
    searched_companies = state.get("searched_companies", [])
    
    if not user_context:
        raise ValueError("user_context is missing from the state.")
        
    company_auth_scores = {}
    errors = state.get("errors", [])
    
    for company in searched_companies:
        if not company.name:
            continue
            
        try:
            score_result = await authenticate_company(
                user_context=user_context,
                searched_company=company,
            )
            company_auth_scores[company.name] = score_result
        except Exception as e:
            errors.append(f"Error authenticating {company.name}: {str(e)}")
            
    return {
        "company_auth_scores": company_auth_scores,
        "errors": errors
    }
