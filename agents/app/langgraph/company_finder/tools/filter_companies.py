"""LangGraph node for filtering companies based on their authentication scores."""

from typing import Any, Dict

from ..state.state import GraphState


async def filter_companies_node(state: GraphState) -> Dict[str, Any]:
    """Node that filters authenticated companies into accepted and rejected lists."""
    searched_companies = state.get("searched_companies", [])
    company_auth_scores = state.get("company_auth_scores", {})
    
    accepted_companies = []
    rejected_companies = []
    feedbacks = []
    
    for company in searched_companies:
        if not company.name:
            continue
            
        auth_info = company_auth_scores.get(company.name)
        if auth_info:
            if auth_info.score >= 70:
                accepted_companies.append(company)
            else:
                rejected_companies.append(company)
                if auth_info.feedback:
                    feedbacks.append(f"Company: {company.name} - Feedback: {auth_info.feedback}")

    search_feedback = "\n".join(feedbacks) if feedbacks else ""
    
    return {
        "accepted_companies": accepted_companies,
        "rejected_companies": rejected_companies,
        "search_feedback": search_feedback,
    }
