"""Route: write an email using the existing email-writer LangGraph workflow."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.auth import authorize_org_member
from app.langgraph.email_writer.graph import run_email_writer_workflow

router = APIRouter()


class WriteEmailRequest(BaseModel):
    token: str
    org_id: str
    target_company_id: str


@router.post("/write-email")
async def write_email(body: WriteEmailRequest):
    user_id = await authorize_org_member(body.token, body.org_id)
    result = await run_email_writer_workflow(user_id, body.org_id, body.target_company_id)

    generated_email = result.get("generated_email")
    return {
        "subject": getattr(generated_email, "subject", None),
        "body": getattr(generated_email, "body", None),
        "review_score": result.get("review_score"),
        "errors": result.get("errors", []),
    }
