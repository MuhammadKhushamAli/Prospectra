"""Parameter-generation agent."""

import os
from typing import Optional

from openai import AsyncOpenAI

from app.agents.params_generation.helpers.param_gen_helpers import (
    _enforce_query_rules,
    build_param_gen_user_input,
)
from app.core.llms.open_ai_llm import parse_structured_response
from app.models.user_context import UserContext
from app.utils.constants.agent_constants import (
    DEFAULT_EXCLUSIONS,
    DEFAULT_OPENAI_BASE_URL,
    DEFAULT_OPENAI_MODEL,
    PARAM_GEN_SYSTEM_PROMPT,
)
from app.utils.helpers.state_helpers import (
    extract_skill_names,
    extract_target_industries_list,
)
from .pydantic_model import PromptGenerationResponse, SearxngPrompt, SearxngQuery

SYSTEM_PROMPT = PARAM_GEN_SYSTEM_PROMPT


async def generate_params(
    user_context: UserContext,
    search_feedback: Optional[str] = None,
    previous_prompt: Optional[PromptGenerationResponse] = None,
) -> PromptGenerationResponse:
    """Generate high-intent SearXNG search parameters from user profile."""
    client = AsyncOpenAI(
        api_key=os.getenv("PARAM_GEN_API_KEY", os.getenv("OPENAI_API_KEY")),
        base_url=os.getenv("PARAM_GEN_BASE_URL", DEFAULT_OPENAI_BASE_URL),
    )
    model_name = os.getenv("PARAM_GEN_MODEL", DEFAULT_OPENAI_MODEL)

    skills_list = extract_skill_names(user_context)
    target_industries = extract_target_industries_list(user_context)

    user_input = build_param_gen_user_input(
        user_context=user_context,
        skills_list=skills_list,
        target_industries=target_industries,
        search_feedback=search_feedback,
        previous_prompt=previous_prompt,
    )

    response = await parse_structured_response(
        client=client,
        model_name=model_name,
        input=user_input,
        system_prompt=SYSTEM_PROMPT,
        pydantic_model=PromptGenerationResponse,
    )

    return _enforce_query_rules(response, target_industries, skills_list)


__all__ = [
    "DEFAULT_EXCLUSIONS",
    "PromptGenerationResponse",
    "SYSTEM_PROMPT",
    "SearxngPrompt",
    "SearxngQuery",
    "_enforce_query_rules",
    "generate_params",
]
