import os
from typing import Any

import requests

from ..pydantic_model import ApolloPrompt

from langgraph.graph import StateGraph

def find_apollo_companies(state: StateGraph) -> dict[str, Any]:
    """Find organizations in Apollo using the supplied search filters."""
    api_key = os.getenv("APOLLO_API_KEY")
    api_url = os.getenv("APOLLO_COMPANIES_SEARCH_URL")
    if not api_key:
        raise ValueError("APOLLO_API_KEY is required to search Apollo companies")
    if not api_url:
        raise ValueError("APOLLO_COMPANIES_SEARCH_URL is required to search Apollo companies")

    appolio_model: ApolloPrompt = state.get("apollo_prompt_model")
    payload = appolio_model.model_dump(
        exclude_none=True,
    )
    response = requests.post(
        api_url,
        headers={
            "Cache-Control": "no-cache",
            "Content-Type": "application/json",
            "accept": "application/json",
            "x-api-key": api_key,
        },
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    return {
        "companies data": response.json()
    }
