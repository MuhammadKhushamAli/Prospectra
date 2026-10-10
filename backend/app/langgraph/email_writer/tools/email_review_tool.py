from typing import Dict, Any

from app.langgraph.email_writer.state.state import EmailGraphState
from app.agents.email_verifier_agent.email_verifier_agent import verify_email

async def email_review_node(state: EmailGraphState) -> Dict[str, Any]:
    """Node that reviews the generated email using the email verifier agent."""
    user_context = state.get("user_context")
    target_company = state.get("target_company")
    generated_email = state.get("generated_email")
    
    if not generated_email or not user_context or not target_company:
        return {"errors": state.get("errors", []) + ["Missing email, user context, or target company to review."]}
        
    try:
        verification = await verify_email(
            user_context=user_context,
            target_company=target_company,
            generated_email=generated_email,
        )
        return {"review_score": verification.score, "review_feedback": verification.feedback}
    except Exception as e:
        return {"errors": state.get("errors", []) + [str(e)]}
