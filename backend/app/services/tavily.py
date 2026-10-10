import os
from typing import Any

from tavily import AsyncTavilyClient

from ..agents.params_generation.pydantic_model import TavilyPrompt


async def search_tavily(tavily_prompt_model: TavilyPrompt) -> dict[str, Any]:
    """Search Tavily using the prompt stored in the LangGraph state."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        raise ValueError("TAVILY_API_KEY is required to search Tavily")

    tavily_client = AsyncTavilyClient(api_key=api_key)
    response = await tavily_client.search(tavily_prompt_model.prompt)
    return response
