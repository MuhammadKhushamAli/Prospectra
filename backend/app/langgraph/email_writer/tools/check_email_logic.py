"""LangGraph conditional routing logic for checking email review score and retry count."""

from app.langgraph.email_writer.state.state import EmailGraphState


def check_email_logic(state: EmailGraphState) -> str:
    """Determine whether to rewrite the email or store it based on review score and attempts."""
    score = state.get("review_score", 0)
    attempt = state.get("attempt", 1)
    
    # Store email if score meets quality threshold (>= 70) or if max retry attempts (3) reached
    if score >= 70 or attempt >= 3:
        return "store_email"
        
    return "email_writer"
