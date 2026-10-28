"""Combined prompt-generation output schema."""

from pydantic import BaseModel
from .searxng import SearxngPrompt


class PromptGenerationResponse(BaseModel):
    """Prompt-generation output containing SearXNG queries."""
    searxng: SearxngPrompt
