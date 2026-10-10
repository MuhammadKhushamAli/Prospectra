from typing import TypedDict, List
from app.models.user_context import UserContext
from app.models.company import Company
from app.agents.email_writer_agent.pydantic_model.email_model import EmailContent

class EmailGraphState(TypedDict, total=False):
    """The state of the Email Writer LangGraph workflow."""
    user_context: UserContext
    target_company_id: str
    target_company: Company
    generated_email: EmailContent
    review_score: float
    review_feedback: str
    errors: List[str]
