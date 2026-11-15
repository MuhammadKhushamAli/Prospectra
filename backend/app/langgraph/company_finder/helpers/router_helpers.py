"""Conditional routing helper functions for the company discovery LangGraph workflow."""

from app.core.logging_config import get_node_logger
from app.langgraph.company_finder.state.state import GraphState
from app.utils.constants.prospecting_constants import MAX_SEARCH_ATTEMPTS

logger = get_node_logger("router")


def route_after_search(state: GraphState) -> str:
    """Proceed to scrape if candidates were discovered, otherwise route to filter to build feedback."""
    count = len(state.get("searched_companies", []))
    if count > 0:
        logger.info(f"[ROUTER] {count} company candidate(s) searched -> 'scrape_companies'")
        return "scrape_companies"
    logger.info("[ROUTER] 0 company candidates searched -> 'filter_companies'")
    return "filter_companies"


def route_after_prefilter(state: GraphState) -> str:
    """Proceed to email verification if companies survived pre-filtering, otherwise route to filter."""
    count = len(state.get("scraped_companies", []))
    if count > 0:
        logger.info(f"[ROUTER] {count} company candidate(s) passed pre-filter -> 'verify_emails'")
        return "verify_emails"
    logger.info("[ROUTER] 0 company candidates passed pre-filter -> 'filter_companies'")
    return "filter_companies"


def route_after_verification(state: GraphState) -> str:
    """Proceed to LLM auth only if companies have at least one reachable email."""
    count = len(state.get("verified_companies", []))
    if count > 0:
        logger.info(f"[ROUTER] {count} company(ies) verified with reachable emails -> 'company_auth'")
        return "company_auth"
    logger.info("[ROUTER] 0 companies verified with reachable emails -> 'filter_companies'")
    return "filter_companies"


def check_companies_logic(state: GraphState) -> str:
    """Determine whether to retry search at page 0, regenerate search prompt, or terminate."""
    accepted = state.get("accepted_companies", [])
    if accepted:
        logger.info(f"[ROUTER] {len(accepted)} accepted prospect(s) -> 'store_to_db'")
        return "store_to_db"

    if state.get("same_prompt_retry_active", False):
        logger.info("[ROUTER] 0 accepted prospects -> retrying same prompt at page 0 ('company_search')")
        return "company_search"

    attempts = state.get("search_attempts", 0)
    if attempts < MAX_SEARCH_ATTEMPTS:
        logger.info(
            f"[ROUTER] 0 accepted prospects after page 0 retry -> regenerating prompt (attempt {attempts}/{MAX_SEARCH_ATTEMPTS})"
        )
        return "prompt_gen"

    logger.info(f"[ROUTER] Max search attempts reached ({attempts}/{MAX_SEARCH_ATTEMPTS}) -> 'store_to_db'")
    return "store_to_db"
