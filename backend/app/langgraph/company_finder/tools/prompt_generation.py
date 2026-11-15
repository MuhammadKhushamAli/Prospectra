"""LangGraph node for generating search parameters."""

from typing import Any, Dict

from app.agents.params_generation.param_gen_agent import generate_params
from app.core.logging_config import get_node_logger
from app.langgraph.company_finder.state.state import GraphState
from app.utils.helpers.state_helpers import extract_skill_names

logger = get_node_logger("prompt_gen")


async def generate_search_prompt_node(state: GraphState) -> Dict[str, Any]:
    """Node that generates SearXNG search parameters."""
    user_context = state.get("user_context")
    search_feedback = state.get("search_feedback", None)
    previous_prompt = state.get("search_prompt", None)
    attempts = state.get("search_attempts", 0) + 1

    if not user_context:
        raise ValueError("user_context is missing from the state.")

    if not getattr(user_context, "target_industries", None):
        raise ValueError("Target Industries are missing from the state.")

    skills_names = extract_skill_names(user_context)
    industries_count = len(user_context.target_industries or [])

    result = await generate_params(
        user_context=user_context,
        search_feedback=search_feedback,
        previous_prompt=previous_prompt,
    )

    logger.info(
        f"[PROMPT GENERATION] Attempt #{attempts}: Generated {len(result.searxng.queries)} query(ies) "
        f"for {industries_count} industry(ies) and {len(skills_names)} skill(s)."
    )

    return {
        "search_prompt": result,
        "search_attempts": attempts,
        "same_prompt_retries": 0,
        "same_prompt_retry_active": False,
        "searched_companies": [],
        "scraped_companies": [],
        "verified_companies": [],
        "company_auth_scores": {},
        "accepted_companies": [],
        "rejected_companies": [],
    }
