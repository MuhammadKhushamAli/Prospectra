"""Email-writer agent."""

import os
from typing import Any, Dict, Optional

from openai import AsyncOpenAI

from app.agents.email_writer_agent.helpers.email_writer_helpers import (
    build_email_prompt,
    extract_target_company_signals,
    extract_user_skills,
    format_org_website_url,
    generate_fallback_email,
)
from app.core.llms.open_ai_llm import parse_structured_response
from app.models.company import Company
from app.models.user_context import UserContext
from app.utils.constants.agent_constants import (
    DEFAULT_OPENAI_BASE_URL,
    DEFAULT_OPENAI_MODEL,
    EMAIL_WRITER_SYSTEM_PROMPT,
)
from .pydantic_model.email_model import EmailContent

SYSTEM_PROMPT = EMAIL_WRITER_SYSTEM_PROMPT


async def write_email(
    user_context: UserContext,
    target_company: Company,
    review_feedback: Optional[str] = None,
    user_feedback: Optional[str] = None,
    existing_email: Optional[Dict[str, Any]] = None,
) -> EmailContent:
    """Generate an outreach email body tailored to the target company and user context."""
    user_input = build_email_prompt(
        user_context=user_context,
        target_company=target_company,
        review_feedback=review_feedback or user_feedback,
        existing_email=existing_email,
    )

    api_key = (
        os.getenv("EMAIL_AGENT_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or os.getenv("PARAM_GEN_API_KEY")
    )
    base_url = os.getenv("EMAIL_AGENT_BASE_URL", DEFAULT_OPENAI_BASE_URL)
    model_name = os.getenv("EMAIL_AGENT_MODEL", DEFAULT_OPENAI_MODEL)

    if not api_key:
        return generate_fallback_email(
            user_context=user_context,
            target_company=target_company,
            user_feedback=user_feedback,
            existing_email=existing_email,
        )

    try:
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        return await parse_structured_response(
            client=client,
            model_name=model_name,
            input=user_input,
            system_prompt=SYSTEM_PROMPT,
            pydantic_model=EmailContent,
        )
    except Exception as exc:
        print(f"Warning: OpenAI email generation failed ({exc}), using fallback email generator.")
        return generate_fallback_email(
            user_context=user_context,
            target_company=target_company,
            user_feedback=user_feedback,
            existing_email=existing_email,
        )


__all__ = [
    "SYSTEM_PROMPT",
    "build_email_prompt",
    "extract_target_company_signals",
    "extract_user_skills",
    "format_org_website_url",
    "generate_fallback_email",
    "write_email",
]
