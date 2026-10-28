"""LangGraph state definition for the Prospectra workflow."""

from typing import Any, Dict, List, TypedDict

from app.agents.company_authenticator.pydantic_model.company_auth import CompanyAuth
from app.agents.params_generation.pydantic_model import PromptGenerationResponse
from app.models.company import Company
from app.models.user_context import UserContext


class GraphState(TypedDict, total=False):
    """The state of the Prospectra company-finder LangGraph workflow."""
    user_id: str
    org_id: str
    user_context: UserContext
    target_industries: List[str]
    skill_target_id: str

    # Workflow artifacts
    search_prompt: PromptGenerationResponse
    searched_companies: List[Company]
    scraped_companies: List[Company]
    verified_companies: List[Company]
    company_auth_scores: Dict[str, CompanyAuth]
    accepted_companies: List[Company]
    rejected_companies: List[Company]

    # Iteration tracking & feedback
    search_feedback: str
    seen_domains: List[str]
    search_attempts: int
    pipeline_stats: Dict[str, Any]
    errors: List[str]