"""Service client for self-hosted SearXNG search engine."""

from typing import Any, Dict, List, Optional

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_random_exponential

from app.services.helpers.searxng_helpers import build_searxng_search_params
from app.utils.constants.prospecting_constants import (
    SEARXNG_BASE_URL,
    SEARXNG_DEFAULT_LANGUAGE,
)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_random_exponential(min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
    reraise=True,
)
async def search_searxng(
    client: httpx.AsyncClient,
    query: str,
    page: int = 1,
    language: Optional[str] = None,
    time_range: str = "",
) -> List[Dict[str, Any]]:
    """Execute a search query against the self-hosted SearXNG instance."""
    params = build_searxng_search_params(
        query=query,
        page=page,
        language=language,
        time_range=time_range,
    )

    response = await client.get(
        f"{SEARXNG_BASE_URL}/search",
        params=params,
        timeout=15.0,
    )

    if response.status_code == 403:
        raise RuntimeError(
            "SearXNG JSON format disabled. Please enable 'search.formats: [html, json]' in searxng/settings.yml"
        )

    response.raise_for_status()
    data = response.json()
    return data.get("results", [])


__all__ = [
    "SEARXNG_BASE_URL",
    "SEARXNG_DEFAULT_LANGUAGE",
    "search_searxng",
]
