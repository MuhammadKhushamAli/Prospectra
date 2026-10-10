"""Email-verifier agent.

Takes the user's context, target company, and generated email to score it.
"""

import json
import os
from dataclasses import asdict

from openai import AsyncOpenAI

from app.core.llms.open_ai_llm import parse_structured_response
from app.models.company import Company
from app.models.user_context import UserContext
from app.agents.email_writer_agent.pydantic_model.email_model import EmailContent
from .pydantic_model.email_verifier import EmailVerification

SYSTEM_PROMPT = """
You are Prospectra's email-verifier agent.

You receive:
1. The user's context - the profile and skills of the user.
2. The target company.
3. The generated email (subject and body).

Your job is to evaluate how well the email matches the user's profile and company:
- A score from 0 to 100 indicating quality and relevance.
- If the score is below 70, you MUST provide feedback explaining why the email scored low.

CRITICAL RULES
- A score of 100 means a perfect, highly personalized, and professional email.
- Feedback is mandatory when score < 70.
"""


async def verify_email(
    user_context: UserContext,
    target_company: Company,
    generated_email: EmailContent,
) -> EmailVerification:
    """Score a generated email against the user's profile and target company.

    Parameters
    ----------
    user_context:
        The context and skills of the user.
    target_company:
        The target company.
    generated_email:
        The generated email subject and body.

    Returns
    -------
    EmailVerification
        Verification score (0-100) and feedback.
    """
    user_input = (
        f"USER CONTEXT:\n{json.dumps(asdict(user_context), indent=2)}\n\n"
        f"TARGET COMPANY:\n{json.dumps(asdict(target_company), indent=2)}\n\n"
        f"EMAIL SUBJECT:\n{generated_email.subject}\n\n"
        f"EMAIL BODY:\n{generated_email.body}"
    )

    client = AsyncOpenAI(
        api_key=os.getenv("EMAIL_VERIFIER_API_KEY", os.getenv("EMAIL_AGENT_API_KEY")),
        base_url=os.getenv("EMAIL_VERIFIER_BASE_URL", os.getenv("EMAIL_AGENT_BASE_URL")),
    )
    model_name = os.getenv("EMAIL_VERIFIER_MODEL", os.getenv("EMAIL_AGENT_MODEL", "gpt-4o"))

    return await parse_structured_response(
        client=client,
        model_name=model_name,
        input=user_input,
        system_prompt=SYSTEM_PROMPT,
        pydantic_model=EmailVerification,
    )
