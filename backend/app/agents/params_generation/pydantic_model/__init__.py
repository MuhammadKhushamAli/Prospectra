"""Schemas used by the prompt-generation agent."""

from .prompt_generation import PromptGenerationResponse
from .searxng import SearxngPrompt, SearxngQuery

__all__ = [
    "PromptGenerationResponse",
    "SearxngPrompt",
    "SearxngQuery",
]
