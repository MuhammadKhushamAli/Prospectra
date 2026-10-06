"""Schemas used by the prompt-generation agent."""

from .apollo import ApolloPrompt, DateRange, IntegerRange
from .prompt_generation import PromptGenerationResponse
from .tavily import TavilyPrompt

__all__ = [
    "ApolloPrompt",
    "DateRange",
    "IntegerRange",
    "PromptGenerationResponse",
    "TavilyPrompt",
]
