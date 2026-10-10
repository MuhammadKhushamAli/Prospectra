"""LangGraph definition for the Prospectra workflow."""

from typing import Dict, Any, List

from langgraph.graph import StateGraph, START, END

from app.langgraph.state.state import GraphState
from app.langgraph.tools.prompt_generation import generate_search_prompt_node
from app.langgraph.tools.search_companies import search_companies_node
from app.langgraph.tools.company_auth import authenticate_companies_node
from app.langgraph.tools.filter_companies import filter_companies_node
from app.models.company import Company
from app.models.user_context import UserContext
from app.langgraph.tools.store_to_db import store_to_db_node


def check_companies_logic(state: GraphState) -> str:
    """Determine whether to regenerate the prompt or end the graph."""
    accepted = state.get("accepted_companies", [])
    rejected = state.get("rejected_companies", [])
    
    if len(accepted) == 0 and len(rejected) > 0:
        return "prompt_gen"
        
    return "store_to_db"


workflow = StateGraph(GraphState)

workflow.add_node("prompt_gen", generate_search_prompt_node)
workflow.add_node("company_search", search_companies_node)
workflow.add_node("company_auth", authenticate_companies_node)
workflow.add_node("filter_companies", filter_companies_node)
workflow.add_node("store_to_db", store_to_db_node)

workflow.add_edge(START, "prompt_gen")
workflow.add_edge("prompt_gen", "company_search")
workflow.add_edge("company_search", "company_auth")
workflow.add_edge("company_auth", "filter_companies")
workflow.add_edge("store_to_db", END)

workflow.add_conditional_edges(
    "filter_companies",
    check_companies_logic,
)

app_graph = workflow.compile()


async def run_prospect_workflow(
    user_context: UserContext, 
    skill_target_id: str,
    target_companies: List[Company]
) -> Dict[str, Any]:
    """Execute the full Prospectra pipeline async."""
    initial_state = {
        "user_context": user_context,
        "skill_target_id": skill_target_id,
        "target_companies": target_companies,
        "errors": []
    }
    
    result = await app_graph.ainvoke(initial_state)
    return result
