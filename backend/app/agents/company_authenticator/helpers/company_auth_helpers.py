"""Helper functions for building company authentication LLM prompts."""

from __future__ import annotations

import json

from app.models.company import Company
from app.models.summaries import CandidateCompanySummary, UserContextSummary
from app.models.user_context import UserContext
from app.utils.helpers.dataclass_helpers import dataclass_to_json


def build_candidate_company_summary(searched_company: Company) -> CandidateCompanySummary:
    """Build structured CandidateCompanySummary dataclass for LLM evaluation."""
    return CandidateCompanySummary.from_company(searched_company)


def build_company_auth_user_input(
    user_context: UserContext,
    searched_company: Company,
) -> str:
    """Format the full user input string for the company authenticator LLM."""
    user_summary = UserContextSummary.from_user_context(user_context).to_auth_prompt_dict()
    candidate_summary = build_candidate_company_summary(searched_company)

    return (
        f"=== USER CONTEXT (SKILLS & TARGET INDUSTRIES) ===\n"
        f"{json.dumps(user_summary, indent=2)}\n\n"
        f"=== CANDIDATE COMPANY PROFILE ===\n"
        f"{dataclass_to_json(candidate_summary, indent=2)}\n\n"
        f"Evaluate this candidate company strictly according to the scoring rules."
    )
