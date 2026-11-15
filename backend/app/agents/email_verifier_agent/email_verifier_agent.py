"""Email-verifier agent."""

import os

from openai import AsyncOpenAI

from app.agents.email_verifier_agent.helpers.email_verifier_helpers import (
    build_email_verification_prompt,
)
from app.agents.email_writer_agent.pydantic_model.email_model import EmailContent
from app.core.llms.open_ai_llm import parse_structured_response
from app.models.company import Company
from app.models.user_context import UserContext
from app.utils.constants.agent_constants import (
    DEFAULT_OPENAI_MODEL,
    EMAIL_VERIFIER_SYSTEM_PROMPT,
)
from .pydantic_model.email_verifier import EmailVerification

SYSTEM_PROMPT = EMAIL_VERIFIER_SYSTEM_PROMPT


async def verify_email(
    user_context: UserContext,
    target_company: Company,
    generated_email: EmailContent,
) -> EmailVerification:
    """Score a generated email against the user's profile and target company."""
    user_input = build_email_verification_prompt(user_context, target_company, generated_email)

    client = AsyncOpenAI(
        api_key=os.getenv("EMAIL_VERIFIER_API_KEY", os.getenv("EMAIL_AGENT_API_KEY")),
        base_url=os.getenv("EMAIL_VERIFIER_BASE_URL", os.getenv("EMAIL_AGENT_BASE_URL")),
    )
    model_name = os.getenv("EMAIL_VERIFIER_MODEL", os.getenv("EMAIL_AGENT_MODEL", DEFAULT_OPENAI_MODEL))

    return await parse_structured_response(
        client=client,
        model_name=model_name,
        input=user_input,
        system_prompt=SYSTEM_PROMPT,
        pydantic_model=EmailVerification,
    )


__all__ = [
    "SYSTEM_PROMPT",
    "build_email_verification_prompt",
    "verify_email",
]
