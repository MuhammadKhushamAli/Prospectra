"""Helper functions for formatting the email verifier agent prompt."""

from __future__ import annotations

from app.agents.email_writer_agent.pydantic_model.email_model import EmailContent
from app.models.company import Company
from app.models.summaries import TargetCompanySignalSummary, UserContextSummary
from app.models.user_context import UserContext
from app.utils.helpers.dataclass_helpers import dataclass_to_json


def build_email_verification_prompt(
    user_context: UserContext,
    target_company: Company,
    generated_email: EmailContent,
) -> str:
    """Build structured user input for the email verifier LLM."""
    user_summary = UserContextSummary.from_user_context(user_context)
    company_summary = TargetCompanySignalSummary.from_company(target_company)
    return (
        f"USER CONTEXT:\n{dataclass_to_json(user_summary, indent=2)}\n\n"
        f"TARGET COMPANY:\n{dataclass_to_json(company_summary, indent=2)}\n\n"
        f"EMAIL SUBJECT:\n{generated_email.subject}\n\n"
        f"EMAIL BODY:\n{generated_email.body}"
    )
