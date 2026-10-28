"""Pydantic schemas for SearXNG search queries."""

from typing import List, Literal
from pydantic import BaseModel, ConfigDict, Field


class SearxngQuery(BaseModel):
    """A targeted search query tailored for SearXNG."""

    model_config = ConfigDict(str_strip_whitespace=True)

    query: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Search query string with keywords and negative exclusions.",
    )
    target_industry: str = Field(
        ...,
        description="The target industry this query is searching for.",
    )


class SearxngPrompt(BaseModel):
    """Collection of queries for SearXNG."""

    model_config = ConfigDict(str_strip_whitespace=True)

    queries: List[SearxngQuery] = Field(
        ...,
        min_length=2,
        max_length=6,
        description="List of 2 to 6 high-intent search queries for SearXNG.",
    )
    language: str = Field(default="en", description="Search language code.")
    time_range: Literal["", "day", "week", "month", "year"] = Field(
        default="",
        description="Optional time range filter for search freshness.",
    )
