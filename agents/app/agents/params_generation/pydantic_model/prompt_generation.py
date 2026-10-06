"""Combined prompt-generation output schema."""

from pydantic import BaseModel

from .apollo import ApolloPrompt
from .tavily import TavilyPrompt


class PromptGenerationResponse(BaseModel):
    """Prompt-generation output for Apollo and Tavily."""
    apollo: ApolloPrompt
    tavily: TavilyPrompt
