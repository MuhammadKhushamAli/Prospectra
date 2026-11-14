"""Parameter-generation agent.

Converts user skills and target industries into high-precision SearXNG search queries
specifically designed to discover client businesses that lack an in-house tech workforce.
"""

import json
import os
import re
from dataclasses import asdict
from typing import List, Optional

from openai import AsyncOpenAI

from app.core.llms.open_ai_llm import parse_structured_response
from app.models.user_context import UserContext
from .pydantic_model import PromptGenerationResponse, SearxngPrompt, SearxngQuery

SYSTEM_PROMPT = """
You are Prospectra's parameter-generation agent.

Your job is to convert a user's skills and target industries into high-precision search queries for SearXNG.

MANDATORY MISSION: TARGET OPERATING CLIENT BUSINESSES THAT NEED THE USER'S TECHNICAL SKILLS AND LACK AN IN-HOUSE DEV WORKFORCE SO WE CAN PROPOSE A SOLUTION TO THEM!

1. TARGET NON-TECHNICAL CLIENT BUSINESSES:
   - Target operating businesses in the user's TARGET INDUSTRIES (e.g., healthcare clinics, dental practices, logistics operators, retail brands, commercial real estate, accounting & legal firms, manufacturing, fitness clubs).
   - Core domain MUST NOT be software engineering. These businesses need digital solutions, customer portals, mobile apps, or automation to run and scale their core business.
   - Because they DO NOT have an in-house engineering workforce, they are the ideal clients to hire external specialists and approve our proposed solutions!

2. ABSOLUTELY DO NOT TARGET SOFTWARE AGENCIES OR DEV SHOPS:
   - NEVER target software development agencies, IT consultancies, dev shops, or software engineering vendors.
   - A dev shop already sells software services—they will NEVER buy a solution we pitch to them!

3. SEARCH QUERIES MUST BE NEED-BASED, NOT TECH-NAME PROMOTIONAL:
   - Do NOT just search the tech stack name (e.g., searching "React Native developer" returns software agencies selling React Native).
   - Instead, search for the target business type and their operational intent (e.g., "family dental practice" "book appointment online" official site, "freight logistics company" "client portal" official website).
   - High-Intent Query Patterns:
     * "<business type / industry> official website contact"
     * "<target industry> services platform official site"
     * "independent <target industry> company portal official website"

4. STRICT JOB EXCLUSIONS (MANDATORY - NEVER ADD JOBS):
   - You MUST NEVER search for or return job postings, employment vacancies, recruitment listings, or career pages.
   - We are discovering operating client businesses to sell software solutions to, NOT job listings to apply for!
   - Every query MUST include negative job operators: -jobs -careers -hiring -vacancies -employment.

5. TARGET INDUSTRIES RULES:
   - IF TARGET INDUSTRIES ARE PROVIDED: You MUST STRICTLY target ONLY the provided target industries. Generate queries covering these industries.
   - IF TARGET INDUSTRIES ARE NOT PROVIDED: Select the top 2-3 most suitable non-technical industries for the user's skills.

6. GEOGRAPHIC SCOPE & MARKET TARGETING:
   - Unless specific regions are requested by the user, default to US/North American or Global English-speaking commercial markets.
   - Never allow queries to be so generic that search engines fall back to local IP geolocation. Use high-intent anchors or region terms (e.g. "USA", "US", "North America", or major regional hubs) where appropriate to ensure established international companies are discovered.
"""

DEFAULT_EXCLUSIONS = '-agency -"software development" -jobs -careers -hiring -vacancies -employment -directory -clutch -upwork'


def _enforce_query_rules(
    prompt_resp: PromptGenerationResponse,
    target_industries: List[str],
    skills_list: List[str],
) -> PromptGenerationResponse:
    """Apply deterministic guardrails to generated SearXNG queries."""
    clean_queries: List[SearxngQuery] = []
    seen_queries = set()

    for q in prompt_resp.searxng.queries:
        text = q.query.strip()
        # Remove any stray newlines or multiple spaces
        text = re.sub(r"\s+", " ", text)

        # Ensure baseline exclusions are present using word boundaries
        if not re.search(r"(?i)\b-agency\b", text):
            text = f"{text} -agency"
        if not re.search(r"(?i)\b-jobs\b", text):
            text = f"{text} -jobs -careers -hiring -vacancies"
        if not re.search(r"(?i)\b-directory\b", text):
            text = f"{text} -directory"

        # Cap length to safely fit within schema limit (max 500)
        if len(text) > 450:
            text = text[:450].rsplit(" ", 1)[0]

        if text.lower() not in seen_queries:
            seen_queries.add(text.lower())
            clean_queries.append(
                SearxngQuery(
                    query=text,
                    target_industry=q.target_industry,
                )
            )

    # Ensure every explicit target industry has at least one query
    if target_industries:
        covered_industries = {q.target_industry.lower() for q in clean_queries}
        for ind in target_industries:
            if ind.lower() not in covered_industries and len(clean_queries) < 6:
                clean_queries.append(
                    SearxngQuery(
                        query=f'"{ind}" business official website contact {DEFAULT_EXCLUSIONS}',
                        target_industry=ind,
                    )
                )

    if not clean_queries:
        clean_queries.append(
            SearxngQuery(
                query=f' independent business official website needs these skills {skills_list} {DEFAULT_EXCLUSIONS}',
                target_industry=None,
            )
        )

    prompt_resp.searxng.queries = clean_queries[:6]
    return prompt_resp


async def generate_params(
    user_context: UserContext,
    search_feedback: Optional[str] = None,
    previous_prompt: Optional[PromptGenerationResponse] = None,
) -> PromptGenerationResponse:
    """Generate high-intent SearXNG search parameters from user profile."""
    client = AsyncOpenAI(
        api_key=os.getenv("PARAM_GEN_API_KEY", os.getenv("OPENAI_API_KEY")),
        base_url=os.getenv("PARAM_GEN_BASE_URL", "https://api.openai.com/v1"),
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
        industry_instruction = (
            f"EXPLICIT TARGET INDUSTRIES:\n{json.dumps(target_industries, indent=2)}\n"
            f"MANDATE: Strictly target ONLY these industries. Every query must target one of these."
        )
    else:
        industry_instruction = (
            "NO TARGET INDUSTRIES SPECIFIED.\n"
            "MANDATE: Deduce the 2-3 best non-technical industries that need solutions built with user's skills."
        )

    user_input = (
        f"=== USER PROFILE & SKILLS ===\n"
        f"Full Name: {user_context.full_name}\n"
        f"User Skills: {', '.join(skills_list) if skills_list else 'Full stack development'}\n\n"
        f"=== TARGET INDUSTRIES INSTRUCTION ===\n"
        f"{industry_instruction}\n\n"
        f"Generate 3 to 5 high-precision SearXNG queries targeting client businesses that need these solutions."
    )

    if search_feedback or previous_prompt:
        user_input += "\n\n=== FEEDBACK FROM PREVIOUS SEARCH RUN ===\n"
        if search_feedback:
            user_input += f"{search_feedback}\n\n"
        if previous_prompt and "PREVIOUS QUERIES" not in (search_feedback or ""):
            user_input += (
                f"PREVIOUS QUERIES:\n{previous_prompt.model_dump_json(indent=2)}\n\n"
            )
        user_input += (
            "Adjust search angles, try different business sub-niches, or alter operational keywords to avoid previously rejected domains."
        )

    response = await parse_structured_response(
        client=client,
        model_name=model_name,
        input=user_input,
        system_prompt=SYSTEM_PROMPT,
        pydantic_model=PromptGenerationResponse,
    )

    return _enforce_query_rules(response, target_industries, skills_list)
