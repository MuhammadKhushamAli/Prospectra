"""LangGraph definition for the Prospectra company discovery workflow."""

import os
from typing import Any, Dict, List, Optional

from langgraph.graph import END, START, StateGraph

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

MAX_SEARCH_ATTEMPTS = int(os.environ.get("MAX_SEARCH_ATTEMPTS", "3"))


def route_after_search(state: GraphState) -> str:
    """Proceed to scrape if candidates were discovered, otherwise route to filter to build feedback."""
    count = len(state.get("searched_companies", []))
    if count > 0:
        print(f"\n[ROUTER] Company search found {count} candidate(s) -> proceeding to 'scrape_companies'")
        return "scrape_companies"
    print(f"\n[ROUTER] Company search found 0 candidates -> short-circuiting to 'filter_companies'")
    return "filter_companies"


def route_after_prefilter(state: GraphState) -> str:
    """Proceed to email verification if companies survived pre-filtering, otherwise route to filter."""
    count = len(state.get("scraped_companies", []))
    if count > 0:
        print(f"\n[ROUTER] Pre-filter passed {count} candidate(s) -> proceeding to 'verify_emails'")
        return "verify_emails"
    print(f"\n[ROUTER] Pre-filter left 0 candidates -> short-circuiting to 'filter_companies'")
    return "filter_companies"


def route_after_verification(state: GraphState) -> str:
    """Proceed to LLM auth only if companies have at least one reachable email."""
    count = len(state.get("verified_companies", []))
    if count > 0:
        print(f"\n[ROUTER] Reacher email verification confirmed {count} company(ies) with reachable emails -> proceeding to 'company_auth'")
        return "company_auth"
    print(f"\n[ROUTER] Reacher email verification confirmed 0 companies with reachable emails -> short-circuiting to 'filter_companies'")
    return "filter_companies"


def check_companies_logic(state: GraphState) -> str:
    """Determine whether to regenerate search prompt or terminate."""
    accepted = state.get("accepted_companies", [])
    attempts = state.get("search_attempts", 0)

    if accepted:
        print(f"\n[ROUTER] Pipeline has {len(accepted)} accepted prospect(s) -> proceeding to 'store_to_db'")
        return "store_to_db"

    if attempts < MAX_SEARCH_ATTEMPTS:
        print(f"\n[ROUTER] 0 accepted prospects and search attempts ({attempts}/{MAX_SEARCH_ATTEMPTS}) -> looping back to 'prompt_gen' with feedback")
        return "prompt_gen"

    print(f"\n[ROUTER] 0 accepted prospects and search attempts reached max ({attempts}/{MAX_SEARCH_ATTEMPTS}) -> terminating via 'store_to_db'")
    return "store_to_db"


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
        "user_id": user_id,
        "org_id": org_id,
        "target_industries": target_industries or [],
        "seen_domains": [],
        "search_attempts": 0,
        "errors": [],
    }

    result = await app_graph.ainvoke(
        initial_state,
        config={"recursion_limit": 50},
    )
    return result
