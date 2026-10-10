"""Email-writer agent.

Takes the user's skills, name, email, and target company and generates
an email body (subject + body) via the OpenAI Responses API. The from/to addresses
are chosen by the user and populated separately.
"""

import json
import os
from dataclasses import asdict

from openai import AsyncOpenAI

from app.core.llms.open_ai_llm import parse_structured_response
from app.models.company import Company
from app.models.user_context import UserContext
from .pydantic_model.email_model import EmailContent

SYSTEM_PROMPT = """
You are Prospectra's email-writer agent.

You receive:
1. The user's context - the profile and skills of the user sending the email.
2. The target company - the company the user is reaching out to.

Your job is to write a professional, compelling outreach email that:
- Has a clear, attention-grabbing subject line.
- Has a well-structured body that introduces the user, highlights their
  relevant skills, and proposes a clear call to action.
- Sounds human and personalized, not templated.
- Is concise - no longer than 3-4 short paragraphs.

CRITICAL RULES
- Only generate the subject and body. Do NOT include from/to addresses.
- Use the user's actual name and skills provided. Do not invent details.
- The email should be professional yet friendly in tone.
"""


async def write_email(
    user_context: UserContext,
    target_company: Company,
) -> EmailContent:
    """Generate an outreach email body from the user's profile and target company.

    Parameters
    ----------
    user_context:
        The context and skills of the user sending the email.
    target_company:
        The target company the user is reaching out to.

    Returns
    -------
    EmailContent
        Generated subject and body for the email.
    """
    user_input = (
        f"USER CONTEXT:\n{json.dumps(asdict(user_context), indent=2)}\n\n"
        f"TARGET COMPANY:\n{json.dumps(asdict(target_company), indent=2)}"
    )

    client = AsyncOpenAI(
        api_key=os.getenv("EMAIL_AGENT_API_KEY"),
        base_url=os.getenv("EMAIL_AGENT_BASE_URL"),
    )
    model_name = os.getenv("EMAIL_AGENT_MODEL", "gpt-4o")

    return await parse_structured_response(
        client=client,
        model_name=model_name,
        input=user_input,
        system_prompt=SYSTEM_PROMPT,
        pydantic_model=EmailContent,
    )
