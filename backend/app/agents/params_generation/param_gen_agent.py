"""Parameter-generation agent.

Takes a natural-language prospect description from the user and produces
structured Apollo + Tavily search parameters via the OpenAI Responses API.
"""

import json
import os
from dataclasses import asdict
from typing import List

from openai import AsyncOpenAI

from app.core.llms.open_ai_llm import parse_structured_response
from app.core.skill_match import get_apollo_tech_uids_for_user
from app.models.company import Company
from app.models.user_context import UserContext
from .pydantic_model import PromptGenerationResponse

SYSTEM_PROMPT = """
You are Prospectra's parameter-generation agent.

Your job is to convert a user's skills and target organizations (target industries / sectors) into two sets of structured search parameters: Apollo parameters and Tavily parameters.

MANDATORY OBJECTIVE: TARGET BOTH USER SKILLS AND TARGET ORGANIZATIONS
You MUST ensure that the generated parameters target BOTH:
1. User Skills: The technical skills, technologies, and services the user provides.
2. Target Organizations: The types of client companies, businesses, or industries the user wants to target.

CRITICAL RULES FOR TARGET ORGANIZATIONS (TARGET ORGS):
- RULE 1: IF TARGET ORGANIZATIONS ARE PRESENT:
  * You MUST STRICTLY target ONLY the provided target organizations / industries.
  * DO NOT assume, guess, substitute, or add ANY other target organizations or industries. Respect the user's explicit target organizations exactly.
  * In Apollo parameters, set `target_organizations_catagories` to match the exact provided target organizations.
  * In Tavily parameters, formulate the search prompt focused on those exact target organizations.

- RULE 2: IF TARGET ORGANIZATIONS ARE NOT PRESENT (None, empty, or 'NOT SPECIFIED'):
  * You MUST determine and select the SINGLE BEST SUITABLE target organizations/industries for the user based strictly on their skills and expertise (e.g., for React Native + Node.js -> industries which needs mobile apps for their work like online platforms, stores.).
  * Use these deduced best suitable organizations for `target_organizations_catagories` and Tavily search prompt.

SEARCH PARAMETERS TO GENERATE:
1. Apollo parameters (Apollo organization-search API):
   - `target_organizations_catagories`: Categories/industries of the target organizations (use the exact provided target orgs if present; or the deduced best suitable ones if not present).
   - `q_organization_keyword_tags`: Keywords that combine BOTH the user skills/technologies AND relevant domain keywords of the target organizations.
   - `target_organizations_required_skills`: Skills associated with the target organizations matching the user's skills.
   - Standard filters like `organization_locations`, `organization_num_employees_ranges` when appropriate.

2. Tavily parameters (Web search prompt for target prospect companies):
   - MUST construct a concise, high-intent search query discovering actual target prospect companies, software agencies, SaaS businesses, consultancies, or client enterprises that match BOTH the target organizations AND the user's skills.
   - Pattern: "top <target organizations> companies utilizing <user skills>" or "<target organizations> firms in need of <user skills> solutions".
   - CRITICAL REQUIREMENT: NEVER search for jobs, job boards, hiring ads, career vacancies, or freelance job postings! NEVER use words like "jobs", "hiring", "careers", "apply", "job openings", or "vacancies". Discover COMPANY HOMEPAGES and BUSINESS PROFILES only.

CRITICAL RULES:
- Target actual COMPANIES and ORGANIZATIONS, never job boards or employment listings.
- ALWAYS target BOTH user skills and target organizations.
- If target organizations are present, NEVER assume or substitute other target organizations.
- If target organizations are missing, deduce the best suitable target organizations for the user.
"""


async def generate_params(
    user_context: UserContext,
    search_feedback: str | None = None,
    previous_prompt: PromptGenerationResponse | None = None,
) -> PromptGenerationResponse:
    """Convert user skills and target organizations into search parameters.

    Parameters
    ----------
    user_context:
        The context, skills, and target organizations of the user seeking prospects.

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

    skills_list: List[str] = [
        s.name if hasattr(s, "name") else str(s)
        for s in (user_context.skills or [])
    ]
    target_industries: List[str] = [
        str(o).strip()
        for o in (user_context.target_industries or [])
        if str(o).strip()
    ]

    if target_industries:
        target_industry_instruction = (
            f"EXPLICIT TARGET INDUSTRIES PROVIDED:\n"
            f"{json.dumps(target_industries, indent=2)}\n"
            f"MANDATE: You MUST target ONLY these provided target industries. DO NOT assume, invent, or add ANY other target industries!"
        )
    else:
        target_industry_instruction = (
            "NO TARGET INDUSTRIES PROVIDED (NOT SPECIFIED).\n"
            "MANDATE: Target industries are not present. You MUST deduce and generate the BEST SUITABLE target industries for the user based strictly on their skills!"
        )

    input_str = (
        f"=== USER PROFILE & SKILLS ===\n"
        f"Full Name: {user_context.full_name}\n"
        f"User Skills: {', '.join(skills_list) if skills_list else 'Not specified'}\n\n"
        f"=== TARGET INDUSTRIES STATUS ===\n"
        f"{target_industry_instruction}\n\n"
        f"=== DETAILED USER CONTEXT ===\n"
        f"{json.dumps(asdict(user_context), indent=2, default=str)}\n\n"
        f"Generate Apollo and Tavily search parameters targeting BOTH user skills and target industries."
    )

    if search_feedback and previous_prompt:
        input_str += (
            f"\n\nPREVIOUS PROMPT GENERATED:\n{previous_prompt.model_dump_json(indent=2)}\n\n"
            f"FEEDBACK ON PREVIOUS PROMPT:\n{search_feedback}\n\n"
            f"Please adjust the search parameters based on the feedback above while maintaining the target industry rules."
        )

    response = await parse_structured_response(
        client=client,
        model_name=model_name,
        input=input_str,
        system_prompt=SYSTEM_PROMPT,
        pydantic_model=PromptGenerationResponse,
    )

    if response.apollo:
        # If target industries are explicitly present, strictly enforce them
        if target_industries:
            response.apollo.target_organizations_catagories = list(target_industries)

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

    if response.tavily and target_industries:
        # Enforce that Tavily search prompt explicitly includes the target industries if provided
        prompt_lower = response.tavily.prompt.lower()
        has_any_target_industry = any(ind.lower() in prompt_lower for ind in target_industries)
        has_any_skill = any(skill.lower() in prompt_lower for skill in skills_list)

        if not has_any_target_industry or not has_any_skill:
            industries_str = ", ".join(target_industries[:3])
            skills_str = ", ".join(skills_list[:3]) if skills_list else "software development"
            response.tavily.prompt = f"top {industries_str} companies and agencies utilizing {skills_str}"

    return response
