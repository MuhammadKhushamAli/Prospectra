from typing import TypedDict, List, Optional, Dict, Any
from app.models.user_context import UserContext
from app.models.company import Company
from app.agents.email_writer_agent.pydantic_model.email_model import EmailContent

class EmailGraphState(TypedDict, total=False):
    """The state of the Email Writer LangGraph workflow."""
    user_id: str
    org_id: str
    org_domain: Optional[str]
    user_context: UserContext
    target_company_id: str
    target_company: Company
    contact_id: Optional[str]
    recipient_emails: Optional[List[str]]
    user_feedback: Optional[str]
    existing_email_id: Optional[str]
    existing_email: Optional[Dict[str, Any]]
    generated_email: EmailContent
    review_score: float
    review_feedback: str
    attempt: int
    stored_email_id: Optional[str]
    errors: List[str]
