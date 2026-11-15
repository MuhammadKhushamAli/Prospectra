"""LangGraph definition for the Prospectra company discovery workflow."""

from typing import Any, Dict, List, Optional

from langgraph.graph import END, START, StateGraph

from app.langgraph.company_finder.helpers.router_helpers import (
    check_companies_logic,
    route_after_prefilter,
    route_after_search,
    route_after_verification,
)
from app.langgraph.company_finder.state.state import GraphState
from app.langgraph.company_finder.tools.company_auth import authenticate_companies_node
from app.langgraph.company_finder.tools.filter_companies import filter_companies_node
from app.langgraph.company_finder.tools.prefilter_companies import prefilter_companies_node
from app.langgraph.company_finder.tools.prompt_generation import generate_search_prompt_node
from app.langgraph.company_finder.tools.scrape_companies import scrape_companies_node
from app.langgraph.company_finder.tools.search_companies import search_companies_node
from app.langgraph.company_finder.tools.store_to_db import store_to_db_node
from app.langgraph.company_finder.tools.verify_emails import verify_emails_node
from app.langgraph.tools.load_user_context import load_user_context_node
from app.models.user_context import UserContext
from app.utils.constants.prospecting_constants import (
    MAX_SEARCH_ATTEMPTS,
    MIN_SEARCH_ACCEPT_RATE,
)

workflow = StateGraph(GraphState)

workflow.add_node("load_user_context", load_user_context_node)
workflow.add_node("prompt_gen", generate_search_prompt_node)
workflow.add_node("company_search", search_companies_node)
workflow.add_node("scrape_companies", scrape_companies_node)
workflow.add_node("prefilter_companies", prefilter_companies_node)
workflow.add_node("verify_emails", verify_emails_node)
workflow.add_node("company_auth", authenticate_companies_node)
workflow.add_node("filter_companies", filter_companies_node)
workflow.add_node("store_to_db", store_to_db_node)

workflow.add_edge(START, "load_user_context")
workflow.add_edge("load_user_context", "prompt_gen")
workflow.add_edge("prompt_gen", "company_search")

workflow.add_conditional_edges(
    "company_search",
    route_after_search,
    {
        "scrape_companies": "scrape_companies",
        "filter_companies": "filter_companies",
    },
)

workflow.add_edge("scrape_companies", "prefilter_companies")

workflow.add_conditional_edges(
    "prefilter_companies",
    route_after_prefilter,
    {
        "verify_emails": "verify_emails",
        "filter_companies": "filter_companies",
    },
)

workflow.add_conditional_edges(
    "verify_emails",
    route_after_verification,
    {
        "company_auth": "company_auth",
        "filter_companies": "filter_companies",
    },
)

workflow.add_edge("company_auth", "filter_companies")

workflow.add_conditional_edges(
    "filter_companies",
    check_companies_logic,
    {
        "company_search": "company_search",
        "prompt_gen": "prompt_gen",
        "store_to_db": "store_to_db",
    },
)

workflow.add_edge("store_to_db", END)

app_graph = workflow.compile()


async def run_prospect_workflow(
    user_id: str,
    org_id: str,
    target_industries: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Execute the full Prospectra pipeline async."""
    initial_state = {
        "user_context": UserContext(
            user_id=user_id,
            org_id=org_id,
            full_name="",
            email="",
            target_industries=list(target_industries or []),
        ),
        "seen_domains": [],
        "search_attempts": 0,
        "same_prompt_retries": 0,
        "same_prompt_retry_active": False,
        "errors": [],
    }

    result = await app_graph.ainvoke(
        initial_state,
        config={"recursion_limit": 50},
    )
    return result


__all__ = [
    "MAX_SEARCH_ATTEMPTS",
    "MIN_SEARCH_ACCEPT_RATE",
    "route_after_search",
    "route_after_prefilter",
    "route_after_verification",
    "check_companies_logic",
    "app_graph",
    "run_prospect_workflow",
]
