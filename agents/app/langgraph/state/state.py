"""LangGraph state definition for the Prospectra workflow."""

from typing import Dict, List, TypedDict

from app.agents.company_authenticator.pydantic_model.company_auth import CompanyAuth
from app.agents.email_writer_agent.pydantic_model.email_model import EmailContent
from app.agents.params_generation.pydantic_model import PromptGenerationResponse
from app.models.company import Company
from app.models.user_context import UserContext


class GraphState(TypedDict, total=False):
    """The state of the Prospectra LangGraph workflow."""
    user_context: UserContext
    target_companies: List[Company]
    search_prompt: PromptGenerationResponse
    searched_companies: List[Company]
    company_auth_scores: Dict[str, CompanyAuth]
    errors: List[str]