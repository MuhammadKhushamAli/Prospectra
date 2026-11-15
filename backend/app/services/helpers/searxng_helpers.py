"""Helper functions for constructing SearXNG search query parameters."""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.utils.constants.prospecting_constants import SEARXNG_DEFAULT_LANGUAGE


def build_searxng_search_params(
    query: str,
    page: int = 1,
    language: Optional[str] = None,
    time_range: str = "",
) -> Dict[str, Any]:
    """Construct query parameters for the SearXNG `/search` endpoint."""
    params: Dict[str, Any] = {
        "q": query,
        "format": "json",
        "pageno": page,
        "categories": "general",
        "language": language or SEARXNG_DEFAULT_LANGUAGE,
        "safesearch": 0,
    }
    if time_range:
        params["time_range"] = time_range
    return params
