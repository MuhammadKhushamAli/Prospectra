"""Helper functions for enforcing SearXNG query guardrails and building parameter generation prompts."""

from __future__ import annotations

import json
import re
from typing import List, Optional

from app.agents.params_generation.pydantic_model import PromptGenerationResponse, SearxngQuery
from app.models.user_context import UserContext
from app.utils.constants.agent_constants import DEFAULT_EXCLUSIONS


def _enforce_query_rules(
    prompt_resp: PromptGenerationResponse,
    target_industries: List[str],
    skills_list: List[str],
) -> PromptGenerationResponse:
    """Apply deterministic guardrails to generated SearXNG queries."""
    clean_queries: List[SearxngQuery] = []
    seen_queries = set()

    for q in prompt_resp.searxng.queries:
        text = re.sub(r"\s+", " ", q.query.strip())

        if not re.search(r"(?i)\b-agency\b", text):
            text = f"{text} -agency"
        if not re.search(r"(?i)\b-jobs\b", text):
            text = f"{text} -jobs -careers -hiring -vacancies"
        if not re.search(r"(?i)\b-directory\b", text):
            text = f"{text} -directory"

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

    if target_industries:
        covered_industries = {(q.target_industry or "").lower() for q in clean_queries}
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
                query=f" independent business official website needs these skills {skills_list} {DEFAULT_EXCLUSIONS}",
                target_industry=None,
            )
        )

    prompt_resp.searxng.queries = clean_queries[:6]
    return prompt_resp


def build_param_gen_user_input(
    user_context: UserContext,
    skills_list: List[str],
    target_industries: List[str],
    search_feedback: Optional[str] = None,
    previous_prompt: Optional[PromptGenerationResponse] = None,
) -> str:
    """Construct the user input prompt for the parameter generation LLM."""
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
            user_input += f"PREVIOUS QUERIES:\n{previous_prompt.model_dump_json(indent=2)}\n\n"
        user_input += (
            "Adjust search angles, try different business sub-niches, or alter operational keywords to avoid previously rejected domains."
        )

    return user_input
