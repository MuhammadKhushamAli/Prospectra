"""Company-authentication agent."""

import os

from openai import AsyncOpenAI

from app.agents.company_authenticator.helpers.company_auth_helpers import (
    build_candidate_company_summary,
    build_company_auth_user_input,
)
from app.core.llms.open_ai_llm import parse_structured_response
from app.models.company import Company
from app.models.user_context import UserContext
from app.utils.constants.agent_constants import (
    COMPANY_AUTH_SYSTEM_PROMPT,
    DEFAULT_OPENAI_BASE_URL,
    DEFAULT_OPENAI_MODEL,
)
from .pydantic_model.company_auth import CompanyAuth

SYSTEM_PROMPT = COMPANY_AUTH_SYSTEM_PROMPT


async def authenticate_company(
    user_context: UserContext,
    searched_company: Company,
) -> CompanyAuth:
    """Score and authenticate a candidate company for buyer fit."""
    user_input = build_company_auth_user_input(user_context, searched_company)

    client = AsyncOpenAI(
        api_key=os.getenv("COMPANY_AUTH_API_KEY", os.getenv("OPENAI_API_KEY")),
        base_url=os.getenv("COMPANY_AUTH_BASE_URL", DEFAULT_OPENAI_BASE_URL),
    )
    model_name = os.getenv("COMPANY_AUTH_MODEL", DEFAULT_OPENAI_MODEL)

    return await parse_structured_response(
        client=client,
        model_name=model_name,
        input=user_input,
        system_prompt=SYSTEM_PROMPT,
        pydantic_model=CompanyAuth,
    )


__all__ = [
    "SYSTEM_PROMPT",
    "authenticate_company",
    "build_candidate_company_summary",
    "build_company_auth_user_input",
]
