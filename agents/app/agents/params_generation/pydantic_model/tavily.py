"""Pydantic schema for Tavily prompt output."""

from pydantic import BaseModel, ConfigDict, Field


class TavilyPrompt(BaseModel):
    """The sole input needed to form a Tavily search request."""

    model_config = ConfigDict(str_strip_whitespace=True)

    prompt: str = Field(..., description="The search prompt for Tavily.", min_length=1)
