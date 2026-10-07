"""LangGraph node for generating search parameters."""

import json
from dataclasses import asdict
from typing import Any, Dict

from app.agents.params_generation.param_gen_agent import generate_params
from app.langgraph.state.state import GraphState


def generate_search_prompt_node(state: GraphState) -> Dict[str, Any]:
    """Node that generates Apollo and Tavily search parameters.
    
    Extracts the user's context and target companies from the current
    state, formats them into a single prompt string, uses the param_gen_agent
    to generate the search prompt, and stores the result back in the state.
    """
    user_context = state.get("user_context")
    target_companies = state.get("target_companies", [])
    
    if not user_context:
        raise ValueError("user_context is missing from the state.")
        
    # Format the inputs into a string since param_gen_agent expects a string input
    input_str = (
        f"USER CONTEXT:\n{json.dumps(asdict(user_context), indent=2)}\n\n"
        f"TARGET COMPANIES:\n{json.dumps([asdict(c) for c in target_companies], indent=2)}"
    )
        
    result = generate_params(user_input=input_str)
    
    return {"search_prompt": result}
