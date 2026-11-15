"""Tool to check if an email already exists for a target company in Supabase and fetch it."""

from typing import Any, Dict

from app.langgraph.email_writer.state.state import EmailGraphState
from app.langgraph.email_writer.tools.helpers.existing_email_helpers import (
    build_existing_email_state_result,
    query_existing_company_email,
)
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import EMAILS_TABLE
from app.utils.constants.email_constants import (
    ALREADY_GENERATED_ERROR,
    ALREADY_SENT_ERROR,
    REJECTED_COMPANY_ERROR,
)
from app.utils.helpers.db_status_helpers import (
    is_email_already_generated,
    is_email_sent,
)
from app.utils.helpers.state_helpers import (
    resolve_org_id,
    resolve_state_company_id,
    resolve_user_id,
)


async def get_existing_email_node(state: EmailGraphState) -> Dict[str, Any]:
    """Node that checks if an email with respect to the company exists in DB and fetches it."""
    company_id = resolve_state_company_id(state)
    if not company_id:
        return {"existing_email_id": None, "existing_email": None}

    user_context = state.get("user_context")
    user_id = state.get("user_id") or resolve_user_id(user_context)
    org_id = state.get("org_id") or resolve_org_id(user_context)

    supabase = await get_supabase_client()
    existing_record = await query_existing_company_email(
        supabase=supabase,
        emails_table=EMAILS_TABLE,
        company_id=company_id,
        user_id=str(user_id) if user_id else None,
        org_id=str(org_id) if org_id else None,
    )

    if existing_record:
        return build_existing_email_state_result(
            existing_record=existing_record,
            current_errors=list(state.get("errors", [])),
        )

    return {"existing_email_id": None, "existing_email": None}


__all__ = [
    "ALREADY_SENT_ERROR",
    "ALREADY_GENERATED_ERROR",
    "REJECTED_COMPANY_ERROR",
    "is_email_sent",
    "is_email_already_generated",
    "query_existing_company_email",
    "resolve_state_company_id",
    "get_existing_email_node",
]
