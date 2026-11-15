"""Conditional routing helper functions for the Email Writer LangGraph workflow."""

from langgraph.graph import END

from app.langgraph.email_writer.state.state import EmailGraphState
from app.utils.helpers.db_status_helpers import is_email_already_generated


def route_after_existing_email(state: EmailGraphState) -> str:
    """Stop workflow immediately when company is rejected or an email has already been generated."""
    company = state.get("target_company")
    company_status = (
        getattr(company, "status", None)
        if company and not isinstance(company, dict)
        else (company or {}).get("status")
    )
    if str(company_status or "").strip().lower() == "rejected":
        return END

    if is_email_already_generated(state.get("existing_email")):
        return END

    return "email_writer"
