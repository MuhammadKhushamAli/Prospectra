"""LangGraph conditional routing logic for checking email review score and retry count."""

from app.langgraph.email_writer.state.state import EmailGraphState
from app.utils.constants.email_constants import (
    EMAIL_MAX_RETRY_ATTEMPTS,
    EMAIL_REVIEW_MIN_SCORE,
)


def check_email_logic(state: EmailGraphState) -> str:
    """Determine whether to rewrite the email or store it based on review score and attempts."""
    score = state.get("review_score", 0)
    attempt = state.get("attempt", 1)

    if score >= EMAIL_REVIEW_MIN_SCORE or attempt >= EMAIL_MAX_RETRY_ATTEMPTS:
        return "store_email"

    return "email_writer"
