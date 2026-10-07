"""Schemas used by the prompt-generation agent."""

from .apollo import ApolloPrompt
from .prompt_generation import PromptGenerationResponse
from .tavily import TavilyPrompt

__all__ = [
    "ApolloPrompt",
    "PromptGenerationResponse",
    "TavilyPrompt",
]
