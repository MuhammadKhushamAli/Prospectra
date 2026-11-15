"""Helper functions for querying existing emails and building state payloads."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.models.summaries import ExistingEmailSummary
from app.utils.constants.email_constants import (
    ALREADY_GENERATED_ERROR,
    ALREADY_SENT_ERROR,
)
from app.utils.helpers.db_status_helpers import is_email_sent

EMAIL_SUMMARY_SELECT_COLUMNS = (
    "id, subject, body, review_score, review_feedback, status, "
    "sent_by_user_id, sent_by_org_id, contact_id, created_at"
)


async def query_existing_company_email(
    supabase: Any,
    emails_table: str,
    company_id: str,
    user_id: Optional[str] = None,
    org_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Query the emails table for an existing draft or email for this company."""
    try:
        query = (
            supabase.table(emails_table)
            .select(EMAIL_SUMMARY_SELECT_COLUMNS)
            .eq("company_id", company_id)
        )
        if user_id:
            query = query.eq("sent_by_user_id", user_id)
        if org_id:
            query = query.eq("sent_by_org_id", org_id)

        response = await query.order("created_at", desc=True).limit(1).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]

        fallback_query = (
            supabase.table(emails_table)
            .select(EMAIL_SUMMARY_SELECT_COLUMNS)
            .eq("company_id", company_id)
            .order("created_at", desc=True)
            .limit(1)
        )
        fallback_res = await fallback_query.execute()
        if fallback_res.data and len(fallback_res.data) > 0:
            return fallback_res.data[0]

        return None
    except Exception as exc:
        print(f"Warning: Failed to query existing email for company {company_id}: {exc}")
        return None


def build_existing_email_state_result(
    existing_record: Dict[str, Any],
    current_errors: List[str],
) -> Dict[str, Any]:
    """Build the state update dict when an existing email record is found for a company."""
    summary = ExistingEmailSummary.from_record(existing_record)
    existing_payload = summary.to_dict()
    errors = list(current_errors)
    error_to_add = ALREADY_SENT_ERROR if is_email_sent(existing_payload) else ALREADY_GENERATED_ERROR
    if error_to_add not in errors:
        errors.append(error_to_add)

    return {
        "existing_email_id": summary.id,
        "existing_email": existing_payload,
        "errors": errors,
    }
