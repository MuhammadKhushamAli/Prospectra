"""Tool to check if an email already exists for a target company in Supabase and fetch it."""

import os
from typing import Dict, Any, Optional

from app.langgraph.email_writer.state.state import EmailGraphState
from app.services.supabase import get_supabase_client


async def query_existing_company_email(
    supabase: Any,
    emails_table: str,
    company_id: str,
    user_id: Optional[str] = None,
    org_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Query the emails table for an existing draft or email for this company."""
    try:
        # First query: filter by company_id and user/org context if available
        query = (
            supabase.table(emails_table)
            .select("id, subject, body, review_score, review_feedback, status, sent_by_user_id, sent_by_org_id, contact_id, created_at")
            .eq("company_id", company_id)
        )
        if user_id:
            query = query.eq("sent_by_user_id", user_id)
        if org_id:
            query = query.eq("sent_by_org_id", org_id)

        response = await query.order("created_at", desc=True).limit(1).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]

        # Fallback query: filter by company_id only
        fallback_query = (
            supabase.table(emails_table)
            .select("id, subject, body, review_score, review_feedback, status, sent_by_user_id, sent_by_org_id, contact_id, created_at")
            .eq("company_id", company_id)
            .order("created_at", desc=True)
            .limit(1)
        )
        fallback_res = await fallback_query.execute()
        if fallback_res.data and len(fallback_res.data) > 0:
            return fallback_res.data[0]

        return None
    except Exception as e:
        print(f"Warning: Failed to query existing email for company {company_id}: {e}")
        return None


def resolve_state_company_id(state: EmailGraphState) -> Optional[str]:
    """Resolve target company ID from state or target_company object."""
    company_id = state.get("target_company_id")
    if company_id:
        return str(company_id)
    target_company = state.get("target_company")
    if target_company:
        if isinstance(target_company, dict):
            return str(target_company.get("id") or "")
        return str(getattr(target_company, "id", "") or "")
    return None


async def get_existing_email_node(state: EmailGraphState) -> Dict[str, Any]:
    """Node that checks if an email with respect to the company exists in DB and fetches it."""
    company_id = resolve_state_company_id(state)
    if not company_id:
        return {"existing_email_id": None, "existing_email": None}

    user_context = state.get("user_context")
    user_id = state.get("user_id")
    if not user_id and user_context:
        user_id = getattr(user_context, "user_id", None)

    org_id = state.get("org_id")
    if not org_id and user_context:
        org_id = getattr(user_context, "org_id", None)

    supabase = await get_supabase_client()
    emails_table = os.environ.get("SUPABASE_EMAIL_TABLE_NAME", "emails")

    existing_record = await query_existing_company_email(
        supabase=supabase,
        emails_table=emails_table,
        company_id=company_id,
        user_id=str(user_id) if user_id else None,
        org_id=str(org_id) if org_id else None,
    )

    if existing_record:
        return {
            "existing_email_id": existing_record.get("id"),
            "existing_email": {
                "id": existing_record.get("id"),
                "subject": existing_record.get("subject"),
                "body": existing_record.get("body"),
                "status": existing_record.get("status"),
            },
        }

    return {"existing_email_id": None, "existing_email": None}

