"""Company-authentication agent.

Takes the user's target skills, target organizations, and the searched companies
returned by Apollo/Tavily and scores each searched company for authenticity.
"""

import json
import os
from dataclasses import asdict

from openai import AsyncOpenAI

from app.core.llms.open_ai_llm import parse_structured_response
from app.models.company import Company
from app.models.user_context import UserContext
from .pydantic_model.company_auth import CompanyAuth

SYSTEM_PROMPT = """
You are Prospectra's company-authentication agent.

You receive:
1. The user's context - the profile, skills, and target organizations/industries of the user.
2. A searched company - a single company record returned from a search.

Your job is to evaluate how well the searched company matches BOTH the user's skills AND their target organizations/industries, and return:
- A score from 0 to 100 indicating how authentic and relevant the match is.
- If the score is below 70, you MUST provide feedback explaining why the company scored low.

CRITICAL RULES
- Evaluate relevance against BOTH user skills and target organizations.
- If target organizations are present in user context, confirm that the company fits into those target organizations/industries.
- Base your score strictly on the data provided. Do not invent or assume facts.
- A score of 100 means a perfect match across skills and target organization profile.
- A score of 0 means no relevance at all.
- Feedback is mandatory when score < 70.
"""


async def authenticate_company(
    user_context: UserContext,
    searched_company: Company,
) -> CompanyAuth:
    """Score a searched company against the user's profile.

    Parameters
    ----------
    user_context:
        The context, skills, and target organizations of the user seeking prospects.
    searched_company:
        A single company record returned from Apollo / Tavily search.

    Returns
    -------
    CompanyAuth
        Authenticity score (0-100) and feedback if score < 70.
    """
    user_input = (
        f"USER CONTEXT:\n{json.dumps(asdict(user_context), indent=2, default=str)}\n\n"
        f"SEARCHED COMPANY:\n{json.dumps(asdict(searched_company), indent=2, default=str)}"
    )

    client = AsyncOpenAI(
        api_key=os.getenv("COMPANY_AUTH_API_KEY"),
        base_url=os.getenv("COMPANY_AUTH_BASE_URL"),
    )
    model_name = os.getenv("COMPANY_AUTH_MODEL", "gpt-4o")

    return await parse_structured_response(
        client=client,
        model_name=model_name,
        input=user_input,
        system_prompt=SYSTEM_PROMPT,
        pydantic_model=CompanyAuth,
    )
