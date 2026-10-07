"""Company-authentication agent.

Takes the user's target skills, target companies, and the searched companies
returned by Apollo/Tavily and scores each searched company for authenticity.
"""

import json
import os
from typing import Any

from openai import OpenAI

from app.core.llms.open_ai_llm import parse_structured_response
from .pydantic_model.company_auth import CompanyAuth

SYSTEM_PROMPT = """
You are Prospectra's company-authentication agent.

You receive:
1. The user's target skills - the skills the user is looking for.
2. The user's target companies - the kind of companies the user wants to find.
3. A searched company - a single company record returned from a search.

Your job is to evaluate how well the searched company matches the user's
target skills and target companies and return:
- A score from 0 to 100 indicating how authentic and relevant the match is.
- If the score is below 70, you MUST provide feedback explaining why the
- company scored low.

CRITICAL RULES
- Base your score strictly on the data provided. Do not invent or assume facts.
- A score of 100 means a perfect match across skills and company profile.
- A score of 0 means no relevance at all.
- Feedback is mandatory when score < 70.
"""


def authenticate_company(
    user_target_skills: list[str],
    user_target_companies: list[str],
    searched_company: dict[str, Any],
) -> CompanyAuth:
    """Score a searched company against the user's targets.

    Parameters
    ----------
    user_target_skills:
        Skills the user is looking for in prospect companies.
    user_target_companies:
        Descriptions or names of the kind of companies the user targets.
    searched_company:
        A single company record returned from Apollo / Tavily search.

    Returns
    -------
    CompanyAuth
        Authenticity score (0-100) and feedback if score < 70.
    """
    user_input = (
        f"USER TARGET SKILLS:\n{json.dumps(user_target_skills, indent=2)}\n\n"
        f"USER TARGET COMPANIES:\n{json.dumps(user_target_companies, indent=2)}\n\n"
        f"SEARCHED COMPANY:\n{json.dumps(searched_company, indent=2)}"
    )

    client = OpenAI(
        api_key=os.getenv("COMPANY_AUTH_API_KEY"),
        base_url=os.getenv("COMPANY_AUTH_BASE_URL"),
    )
    model_name = os.getenv("COMPANY_AUTH_MODEL", "gpt-4o")

    return parse_structured_response(
        client=client,
        model_name=model_name,
        input=user_input,
        system_prompt=SYSTEM_PROMPT,
        pydantic_model=CompanyAuth,
    )
