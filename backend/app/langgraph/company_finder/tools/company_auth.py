"""LangGraph node for company authentication."""

import asyncio
from typing import Any, Dict

from app.core.logging_config import get_node_logger
from app.langgraph.company_finder.state.state import GraphState
from app.langgraph.company_finder.tools.helpers.company_auth_node_helpers import (
    auth_single_company,
    count_qualified_authenticated_companies,
)
from app.langgraph.company_finder.tools.store_search_progress import update_search_page_progress
from app.utils.constants.prospecting_constants import (
    COMPANY_AUTH_CONCURRENCY,
    MIN_AUTH_SCORE,
)

logger = get_node_logger("company_auth")


async def authenticate_companies_node(state: GraphState) -> Dict[str, Any]:
    """Node that scores verified companies against user profile and buyer suitability."""
    user_context = state.get("user_context")
    verified_companies = state.get("verified_companies", [])

    if not user_context:
        raise ValueError("user_context is missing from the state.")

    if not verified_companies:
        logger.info("[COMPANY AUTH] 0 verified companies to authenticate.")
        return {"company_auth_scores": {}}

    semaphore = asyncio.Semaphore(COMPANY_AUTH_CONCURRENCY)
    errors = list(state.get("errors", []))

    tasks = [
        auth_single_company(user_context, comp, semaphore)
        for comp in verified_companies
        if comp.domain
    ]
    results = await asyncio.gather(*tasks)

    company_auth_scores: Dict[str, Any] = {}
    auth_errors = 0
    for domain, score_obj, err in results:
        if err:
            errors.append(err)
            auth_errors += 1
        if domain and score_obj:
            company_auth_scores[domain] = score_obj

    target_industries = getattr(user_context, "target_industries", None) or []
    success_count = count_qualified_authenticated_companies(company_auth_scores, target_industries)

    logger.info(
        f"[COMPANY AUTH] Scored {len(company_auth_scores)}/{len(verified_companies)} companies: "
        f"{success_count} qualified (errors: {auth_errors})."
    )

    await update_search_page_progress(state, success_count=success_count)

    return {
        "company_auth_scores": company_auth_scores,
        "errors": errors,
    }


__all__ = [
    "COMPANY_AUTH_CONCURRENCY",
    "MIN_AUTH_SCORE",
    "auth_single_company",
    "authenticate_companies_node",
]
