"""LangGraph node for generating search parameters."""

from typing import Any, Dict

from app.agents.params_generation.param_gen_agent import generate_params
from ..state.state import GraphState


async def generate_search_prompt_node(state: GraphState) -> Dict[str, Any]:
    """Node that generates Apollo and Tavily search parameters.
    
    Extracts the user's context (skills and target industries) from the current
    state, uses the param_gen_agent to generate the search prompt,
    and stores the result back in the state.
    """
    user_context = state.get("user_context")
    search_feedback = state.get("search_feedback", None)
    previous_prompt = state.get("search_prompt", None)
    
    if not user_context:
        raise ValueError("user_context is missing from the state.")

    # Ensure target industries from state are synced to user_context
    state_target_industries = state.get("target_industries")
    if state_target_industries and not user_context.target_industries:
        user_context.target_industries = list(state_target_industries)
        
    result = await generate_params(
        user_context=user_context,
        search_feedback=search_feedback,
        previous_prompt=previous_prompt,
    )
    
    return {"search_prompt": result}
