"""LangGraph node for generating search parameters."""

from typing import Any, Dict

from app.agents.params_generation.param_gen_agent import generate_params
from app.langgraph.state.state import GraphState


async def generate_search_prompt_node(state: GraphState) -> Dict[str, Any]:
    """Node that generates Apollo and Tavily search parameters.
    
    Extracts the user's context and target companies from the current
    state, uses the param_gen_agent to generate the search prompt,
    and stores the result back in the state.
    """
    user_context = state.get("user_context")
    target_companies = state.get("target_companies", [])
    
    if not user_context:
        raise ValueError("user_context is missing from the state.")
        
    result = await generate_params(
        user_context=user_context,
        target_companies=target_companies,
    )
    
    return {"search_prompt": result}
