"""Email-writer agent.

Takes the user's skills, name, email, and target company and generates
an email body (subject + body) via the OpenAI Responses API. The from/to addresses
are chosen by the user and populated separately.
"""

import json
import os

from openai import OpenAI

from app.core.llms.open_ai_llm import parse_structured_response
from .pydantic_model.email_model import EmailContent

SYSTEM_PROMPT = """
You are Prospectra's email-writer agent.

You receive:
1. The user's name - who is sending the email.
2. The user's email address - for context and sign-off.
3. The user's skills - to highlight relevant expertise in the email.
4. The target company - the company the user is reaching out to.

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


def write_email(
    user_skills: list[str],
    user_name: str,
    user_email: str,
    target_company: str,
) -> EmailContent:
    """Generate an outreach email body from the user's profile.

    Parameters
    ----------
    user_skills:
        The user's skills to highlight in the email.
    user_name:
        The user's full name for the email sign-off.
    user_email:
        The user's email address for context.
    target_company:
        The company the user is reaching out to.

    Returns
    -------
    EmailContent
        Generated subject and body for the email.
    """
    user_input = (
        f"USER NAME:\n{user_name}\n\n"
        f"USER EMAIL:\n{user_email}\n\n"
        f"USER SKILLS:\n{json.dumps(user_skills, indent=2)}\n\n"
        f"TARGET COMPANY:\n{target_company}"
    )

    client = OpenAI(
        api_key=os.getenv("EMAIL_AGENT_API_KEY"),
        base_url=os.getenv("EMAIL_AGENT_BASE_URL"),
    )
    model_name = os.getenv("EMAIL_AGENT_MODEL", "gpt-4o")

    return parse_structured_response(
        client=client,
        model_name=model_name,
        input=user_input,
        system_prompt=SYSTEM_PROMPT,
        pydantic_model=EmailContent,
    )
