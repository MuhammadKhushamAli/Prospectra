"""Parameter-generation agent.

Takes a natural-language prospect description from the user and produces
structured Apollo + Tavily search parameters via the OpenAI Responses API.
"""

import json
import os
from dataclasses import asdict

from openai import OpenAI

from app.core.llms.open_ai_llm import parse_structured_response
from app.models.user_context import UserContext
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


def generate_params(user_context: UserContext) -> PromptGenerationResponse:
    """Convert a natural-language prospect description into search parameters.

    Parameters
    ----------
    user_context:
        The context and skills of the user seeking prospects.

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

    input_str = f"USER CONTEXT:\n{json.dumps(asdict(user_context), indent=2)}"

    return parse_structured_response(
        client=client,
        model_name=model_name,
        input=input_str,
        system_prompt=SYSTEM_PROMPT,
        pydantic_model=PromptGenerationResponse,
    )
