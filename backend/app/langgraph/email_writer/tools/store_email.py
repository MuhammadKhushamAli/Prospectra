"""Node that stores the generated email draft into Supabase public.emails."""

from typing import Any, Dict

from app.langgraph.email_writer.state.state import EmailGraphState
from app.langgraph.email_writer.tools.helpers.store_email_helpers import (
    _is_missing_review_schema_error,
    _without_review_columns,
    build_email_record,
    insert_email_record,
    lookup_contact_id_by_email,
    update_email_record,
)
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import CONTACTS_TABLE, EMAILS_TABLE
from app.utils.constants.email_constants import ALREADY_SENT_ERROR
from app.utils.helpers.db_status_helpers import is_email_sent
from app.utils.helpers.state_helpers import (
    resolve_company_id,
    resolve_org_id,
    resolve_user_id,
)


async def store_email_node(state: EmailGraphState) -> Dict[str, Any]:
    """Node that stores or updates the validated generated email draft in Supabase."""
    user_context = state.get("user_context")
    target_company = state.get("target_company")
    generated_email = state.get("generated_email")
    contact_id = state.get("contact_id")
    recipient_emails = state.get("recipient_emails") or []
    existing_email_id = state.get("existing_email_id")
    review_score = state.get("review_score")
    review_feedback = state.get("review_feedback")

    if not generated_email or not target_company:
        return {}

    if is_email_sent(state.get("existing_email")):
        return {"errors": list(state.get("errors", [])) + [ALREADY_SENT_ERROR]}

    company_id = resolve_company_id(target_company)
    if not company_id:
        return {"errors": state.get("errors", []) + ["Missing company ID when storing email draft."]}

    user_id = resolve_user_id(user_context) or state.get("user_id")
    org_id = resolve_org_id(user_context, target_company) or state.get("org_id")

    try:
        supabase = await get_supabase_client()

        if existing_email_id:
            updated = await update_email_record(
                supabase=supabase,
                table_name=EMAILS_TABLE,
                email_id=existing_email_id,
                subject=generated_email.subject,
                body=generated_email.body,
                review_score=review_score,
                review_feedback=review_feedback,
            )
            if updated:
                return {"stored_email_id": existing_email_id}

        first_stored_id = None

        if recipient_emails and len(recipient_emails) > 0:
            for rec_email in recipient_emails:
                c_id = await lookup_contact_id_by_email(
                    supabase=supabase,
                    contacts_table=CONTACTS_TABLE,
                    company_id=company_id,
                    email_address=rec_email,
                )
                record = build_email_record(
                    company_id=company_id,
                    user_id=user_id,
                    org_id=org_id,
                    contact_id=c_id or contact_id,
                    subject=generated_email.subject,
                    body=generated_email.body,
                    review_score=review_score,
                    review_feedback=review_feedback,
                )
                stored_id = await insert_email_record(supabase, EMAILS_TABLE, record)
                if not first_stored_id:
                    first_stored_id = stored_id
        else:
            record = build_email_record(
                company_id=company_id,
                user_id=user_id,
                org_id=org_id,
                contact_id=contact_id,
                subject=generated_email.subject,
                body=generated_email.body,
                review_score=review_score,
                review_feedback=review_feedback,
            )
            first_stored_id = await insert_email_record(supabase, EMAILS_TABLE, record)

        return {"stored_email_id": first_stored_id}
    except Exception as exc:
        error_msg = f"Failed to store email to Supabase: {str(exc)}"
        print(f"Warning: {error_msg}")
        return {"errors": state.get("errors", []) + [error_msg]}


__all__ = [
    "resolve_user_id",
    "resolve_org_id",
    "resolve_company_id",
    "build_email_record",
    "_is_missing_review_schema_error",
    "_without_review_columns",
    "insert_email_record",
    "update_email_record",
    "store_email_node",
]
