from typing import Dict, Any
from app.langgraph.email_writer.state.state import EmailGraphState
from app.agents.email_writer_agent.email_agent import write_email

async def email_writer_node(state: EmailGraphState) -> Dict[str, Any]:
    """Node that generates an email using the email_agent with feedback support."""
    user_context = state.get("user_context")
    target_company = state.get("target_company")
    review_feedback = state.get("review_feedback")
    user_feedback = state.get("user_feedback")
    existing_email = state.get("existing_email")
    current_attempt = state.get("attempt", 0) + 1
    
    if not user_context or not target_company:
        return {"errors": state.get("errors", []) + ["Missing user_context or target_company"]}
        
    try:
        email = await write_email(
            user_context=user_context,
            target_company=target_company,
            review_feedback=review_feedback,
            user_feedback=user_feedback,
            existing_email=existing_email,
        )
        return {
            "generated_email": email,
            "attempt": current_attempt,
        }
    except Exception as e:
        return {
            "errors": state.get("errors", []) + [f"Email generation error: {str(e)}"],
            "attempt": current_attempt,
        }
