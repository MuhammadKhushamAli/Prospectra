import os
from typing import Any

import requests

from ..agents.params_generation.pydantic_model import ApolloPrompt


def find_apollo_companies(apollo_model: ApolloPrompt) -> dict[str, Any]:
    """Find organizations in Apollo using the supplied search filters."""
    api_key = os.getenv("APOLLO_API_KEY")
    api_url = os.getenv("APOLLO_COMPANIES_SEARCH_URL")
    if not api_key:
        raise ValueError("APOLLO_API_KEY is required to search Apollo companies")
    if not api_url:
        raise ValueError("APOLLO_COMPANIES_SEARCH_URL is required to search Apollo companies")

    payload = apollo_model.model_dump(
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
    return response.json()
