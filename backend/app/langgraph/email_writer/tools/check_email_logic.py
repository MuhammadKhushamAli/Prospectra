"""LangGraph node/conditional logic for checking email review score."""

from app.langgraph.email_writer.state.state import EmailGraphState


def check_email_logic(state: EmailGraphState) -> str:
    """Determine whether to rewrite the email or store it based on review score."""
    score = state.get("review_score", 0)
    
    if score >= 70:
        return "store_email"
        
    return "email_writer"
