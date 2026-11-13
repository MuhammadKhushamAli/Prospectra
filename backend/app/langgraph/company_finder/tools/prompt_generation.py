"""LangGraph node for generating search parameters."""

from typing import Any, Dict

from app.agents.params_generation.param_gen_agent import generate_params
from app.core.logging_config import get_node_logger
from ..state.state import GraphState

logger = get_node_logger("prompt_gen")


async def generate_search_prompt_node(state: GraphState) -> Dict[str, Any]:
    """Node that generates SearXNG search parameters.

    Extracts user context (skills and target industries) from state,
    invokes param_gen_agent, and increments the search attempt counter.
    """
    user_context = state.get("user_context")
    search_feedback = state.get("search_feedback", None)
    previous_prompt = state.get("search_prompt", None)
    attempts = state.get("search_attempts", 0) + 1

    if not user_context:
        raise ValueError("user_context is missing from the state.")

    state_target_industries = state.get("target_industries")
    if state_target_industries and not user_context.target_industries:
        user_context.target_industries = list(state_target_industries)

    skills_names = [
        s.name if hasattr(s, "name") else str(s)
        for s in (user_context.skills or [])
    ]
    logger.banner(f"[PHASE 1: PROMPT GENERATION] Attempt #{attempts}")
    logger.item(f"User: {user_context.full_name} ({user_context.email})")
    logger.item(f"Skills: {', '.join(skills_names) if skills_names else 'None'}")
    logger.item(f"Target Industries: {user_context.target_industries or 'Inferred by LLM'}")
    if search_feedback:
        logger.item(f"Feedback from previous attempt:\n    {search_feedback[:200]}...")

    result = await generate_params(
        user_context=user_context,
        search_feedback=search_feedback,
        previous_prompt=previous_prompt,
    )

    logger.header(f"[PHASE 1: PROMPT GENERATION] Generated {len(result.searxng.queries)} SearXNG queries:")
    for idx, q in enumerate(result.searxng.queries, 1):
        logger.item(f"[{idx}] Industry: {q.target_industry}")
        logger.item(f"    Query: {q.query}")

    return {
        "search_prompt": result,
        "search_attempts": attempts,
        # Reset downstream iteration artifacts
        "searched_companies": [],
        "scraped_companies": [],
        "verified_companies": [],
        "company_auth_scores": {},
        "accepted_companies": [],
        "rejected_companies": [],
    }
