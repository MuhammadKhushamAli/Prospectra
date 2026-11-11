"""Route: write an email using the email-writer LangGraph workflow."""

import os
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.auth import authorize_org_member
from app.core.arq_config import enqueue_arq_job
from app.langgraph.email_writer.tools.get_existing_email_tool import (
    ALREADY_SENT_ERROR,
    is_email_sent,
)
from app.services.supabase import get_supabase_client

router = APIRouter()


class WriteEmailRequest(BaseModel):
    token: str
    org_id: str
    target_company_id: str
    user_id: Optional[str] = None
    feedback: Optional[str] = None
    recipient_emails: Optional[List[str]] = None
    org_domain: Optional[str] = None


class WriteEmailResponse(BaseModel):
    status: str
    email_id: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    review_score: Optional[float] = None
    errors: list[str] = []


async def revert_company_status_to_pending(
    company_id: str,
    org_id: Optional[str] = None,
    pending_status: str = "pending_review",
) -> None:
    """Reset company status back to pending in the database if email generation fails."""
    try:
        supabase = await get_supabase_client()
        table_name = os.environ.get("SUPABASE_COMPANIES_TABLE_NAME", "companies")
        query = supabase.table(table_name).update({"status": pending_status}).eq("id", company_id)
        if org_id:
            query = query.eq("org_id", org_id)
        await query.execute()
    except Exception as e:
        print(f"Warning: Failed to revert company {company_id} status to {pending_status} in DB: {e}")


def format_write_email_response(result: Dict[str, Any]) -> Dict[str, Any]:
    """Format the LangGraph workflow result into a standard API response."""
    if is_email_sent(result.get("existing_email")):
        existing = result.get("existing_email") or {}
        errors = list(result.get("errors", []))
        if ALREADY_SENT_ERROR not in errors:
            errors.append(ALREADY_SENT_ERROR)
        return {
            "status": "error",
            "email_id": result.get("existing_email_id") or existing.get("id"),
            "subject": None,
            "body": None,
            "review_score": None,
            "errors": errors,
        }

    generated_email = result.get("generated_email")
    errors = result.get("errors", [])
    stored_id = result.get("stored_email_id")

    return {
        "status": "success" if (generated_email and not errors) else ("partial" if generated_email else "error"),
        "email_id": stored_id,
        "subject": getattr(generated_email, "subject", None),
        "body": getattr(generated_email, "body", None),
        "review_score": result.get("review_score"),
        "errors": errors,
    }


@router.post("/write-email")
async def write_email(body: WriteEmailRequest):
    """Authenticate member, enqueue email generation job to ARQ worker (which updates DB directly)."""
    try:
        authenticated_user_id = await authorize_org_member(body.token, body.org_id)
    except Exception as auth_err:
        if body.target_company_id:
            await revert_company_status_to_pending(body.target_company_id, body.org_id)
        raise HTTPException(status_code=401, detail=f"Unauthorized: {str(auth_err)}")

    effective_user_id = body.user_id or authenticated_user_id

    job_id = await enqueue_arq_job(
        "write_email_arq_task",
        effective_user_id,
        body.org_id,
        body.target_company_id,
        body.recipient_emails,
        body.org_domain,
        body.feedback,
    )
    if job_id is None:
        if body.target_company_id:
            await revert_company_status_to_pending(body.target_company_id, body.org_id)
        raise HTTPException(status_code=503, detail="Failed to enqueue email generation job in Redis")

    return {
        "status": "queued",
        "job_id": job_id,
    }
