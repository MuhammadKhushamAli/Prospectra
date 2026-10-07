"""Parameter-generation agent.

Takes a natural-language prospect description from the user and produces
structured Apollo + Tavily search parameters via the OpenAI Responses API.
"""

import os

from openai import OpenAI

from app.core.llms.open_ai_llm import parse_structured_response
from .pydantic_model import PromptGenerationResponse

SYSTEM_PROMPT = """
You are Prospectra's parameter-generation agent.

Your job is to convert a user's natural-language description of their ideal
prospect or target company into two sets of structured search parameters:

1. Apollo parameters - filters for the Apollo organization-search API.
2. Tavily parameters - a concise, high-quality search prompt for Tavily.

CRITICAL RULES
- Be precise - never hallucinate filter values.
- CRITICAL: 'must use the user's data given in prompt not do descision from you own.'
"""


def generate_params(user_input: str) -> PromptGenerationResponse:
    """Convert a natural-language prospect description into search parameters.

    Parameters
    ----------
    user_input:
        The user's free-text description of the prospects they want to find.

    Returns
    -------
    PromptGenerationResponse
        Structured Apollo and Tavily search parameters.
    """
    client = OpenAI(
        api_key=os.getenv("PARAM_GEN_API_KEY"),
        base_url=os.getenv("PARAM_GEN_BASE_URL"),
    )
    model_name = os.getenv("PARAM_GEN_MODEL", "gpt-4o")

    return parse_structured_response(
        client=client,
        model_name=model_name,
        input=user_input,
        system_prompt=SYSTEM_PROMPT,
        pydantic_model=PromptGenerationResponse,
    )
