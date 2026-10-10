from typing import Dict, Any
from app.langgraph.email_writer.state.state import EmailGraphState
from app.agents.email_writer_agent.email_agent import write_email

async def email_writer_node(state: EmailGraphState) -> Dict[str, Any]:
    """Node that generates an email using the email_agent."""
    user_context = state.get("user_context")
    target_company = state.get("target_company")
    
    if not user_context or not target_company:
        return {"errors": state.get("errors", []) + ["Missing user_context or target_company"]}
        
    try:
        email = await write_email(user_context=user_context, target_company=target_company)
        return {"generated_email": email}
    except Exception as e:
        return {"errors": state.get("errors", []) + [str(e)]}
