import os
from typing import Any

from tavily import TavilyClient

from ..pydantic_model import TavilyPrompt

from langgraph.graph import StateGraph

def search_tavily(state: StateGraph) -> dict[str, Any]:
    """Search Tavily using the prompt stored in the LangGraph state."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        raise ValueError("TAVILY_API_KEY is required to search Tavily")

    tavily_model: TavilyPrompt = state.get("tavily_prompt_model")
    tavily_client = TavilyClient(api_key=api_key)
    response = tavily_client.search(tavily_model.prompt)
    return {"tavily data": response}
