"""Parameter-generation agent.

Takes a natural-language prospect description from the user and produces
structured Apollo + Tavily search parameters via the OpenAI Responses API.
"""

import json
import os
from dataclasses import asdict

from openai import AsyncOpenAI

from app.core.llms.open_ai_llm import parse_structured_response
from app.core.skill_match import get_apollo_tech_uids_for_user
from app.models.company import Company
from app.models.user_context import UserContext
from .pydantic_model import PromptGenerationResponse

SYSTEM_PROMPT = """
You are Prospectra's parameter-generation agent.

Your job is to convert a user's skills, context, and target prospect goals into two sets of structured search parameters:

1. Apollo parameters - filters for the Apollo organization-search API:
   - Use standard filters like q_organization_keyword_tags, organization_locations, target_organizations_catagories.

2. Tavily parameters - a concise, high-quality search prompt to find TARGET PROSPECT COMPANIES and BUSINESSES:
   - MUST search for actual companies, software agencies, SaaS firms, consultancies, or enterprise client businesses that need or use the user's services.
   - CRITICAL REQUIREMENT: NEVER search for jobs, job boards, hiring ads, career vacancies, or freelance job postings! NEVER use words like "jobs", "hiring", "careers", "apply", "job openings", or "vacancies".
   - Construct queries aimed at discovering company homepages and business profiles (e.g., "top software development agencies and SaaS companies utilizing Python and React Native").

CRITICAL RULES
- Target COMPANIES and ORGANIZATIONS, never job boards or job postings.
- Be precise - never hallucinate filter values.
- Must prioritize the user's skills and context provided in the prompt.
"""


async def generate_params(
    user_context: UserContext,
    search_feedback: str | None = None,
    previous_prompt: PromptGenerationResponse | None = None,
) -> PromptGenerationResponse:
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
    client = AsyncOpenAI(
        api_key=os.getenv("PARAM_GEN_API_KEY"),
        base_url=os.getenv("PARAM_GEN_BASE_URL"),
    )
    model_name = os.getenv("PARAM_GEN_MODEL", "gpt-4o")

    input_str = (
        f"USER CONTEXT:\n{json.dumps(asdict(user_context), indent=2, default=str)}\n\n"
    )
    
    if search_feedback and previous_prompt:
        input_str += (
            f"\n\nPREVIOUS PROMPT GENERATED:\n{previous_prompt.model_dump_json(indent=2)}\n\n"
            f"FEEDBACK ON PREVIOUS PROMPT:\n{search_feedback}\n\n"
            f"Please adjust the search parameters based on the feedback above."
        )

    response = await parse_structured_response(
        client=client,
        model_name=model_name,
        input=input_str,
        system_prompt=SYSTEM_PROMPT,
        pydantic_model=PromptGenerationResponse,
    )
    
    if response.apollo:
        matched_uids = get_apollo_tech_uids_for_user(user_context)
        # Apollo free tier returns 422 on currently_using_any_of_technology_uids.
        # Map tech names to q_organization_keyword_tags to find relevant companies on free tier.
        if matched_uids:
            existing_tags = response.apollo.q_organization_keyword_tags or []
            for uid in matched_uids:
                clean_tag = uid.replace("_", " ")
                if clean_tag not in existing_tags:
                    existing_tags.append(clean_tag)
            response.apollo.q_organization_keyword_tags = existing_tags[:6]
        
    return response
