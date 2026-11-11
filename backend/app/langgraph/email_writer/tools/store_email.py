"""Node that stores the generated email draft into Supabase public.emails."""

import os
from typing import Dict, Any, Optional, List

from app.langgraph.email_writer.state.state import EmailGraphState
from app.services.supabase import get_supabase_client


def resolve_user_id(user_context: Any) -> Optional[str]:
    """Extract user_id safely from user_context."""
    if not user_context:
        return None
    if isinstance(user_context, dict):
        return user_context.get("user_id")
    return getattr(user_context, "user_id", None)


def resolve_org_id(user_context: Any, target_company: Any) -> Optional[str]:
    """Extract active org_id safely from user_context or target_company."""
    if user_context:
        org_id = user_context.get("org_id") if isinstance(user_context, dict) else getattr(user_context, "org_id", None)
        if org_id:
            return org_id
    if target_company:
        return target_company.get("org_id") if isinstance(target_company, dict) else getattr(target_company, "org_id", None)
    return None


def resolve_company_id(target_company: Any) -> Optional[str]:
    """Extract company_id safely from target_company."""
    if not target_company:
        return None
    if isinstance(target_company, dict):
        return target_company.get("id")
    return getattr(target_company, "id", None)


def build_email_record(
    company_id: str,
    user_id: Optional[str],
    org_id: Optional[str],
    contact_id: Optional[str],
    subject: Optional[str],
    body: str,
    review_score: Optional[float] = None,
    review_feedback: Optional[str] = None,
) -> Dict[str, Any]:
    """Construct the database payload matching public.emails table schema."""
    record: Dict[str, Any] = {
        "company_id": company_id,
        "body": body,
        "subject": subject or "Outreach Inquiry",
        "status": "draft",
    }
    if user_id:
        record["sent_by_user_id"] = user_id
    if org_id:
        record["sent_by_org_id"] = org_id
    if contact_id:
        record["contact_id"] = contact_id
    if review_score is not None:
        record["review_score"] = review_score
    if review_feedback:
        record["review_feedback"] = review_feedback
    return record


def _is_missing_review_schema_error(err: Exception) -> bool:
    """Return True when PostgREST schema cache lacks optional review columns."""
    msg = str(err).lower()
    return ("pgrst204" in msg or "schema cache" in msg) and (
        "review_score" in msg or "review_feedback" in msg
    )


def _without_review_columns(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Strip review metadata columns for fallback writes against pre-reset schemas."""
    return {
        k: v
        for k, v in payload.items()
        if k not in ("review_score", "review_feedback")
    }


async def insert_email_record(
    supabase: Any,
    table_name: str,
    record: Dict[str, Any],
) -> Optional[str]:
    """Insert the record into the emails table and return the new email ID."""
    try:
        res = await (
            supabase.table(table_name)
            .insert(record)
            .execute()
        )
    except Exception as e:
        if _is_missing_review_schema_error(e) and (
            "review_score" in record or "review_feedback" in record
        ):
            res = await (
                supabase.table(table_name)
                .insert(_without_review_columns(record))
                .execute()
            )
        else:
            raise
    if res.data and len(res.data) > 0:
        return res.data[0].get("id")
    return None


async def update_email_record(
    supabase: Any,
    table_name: str,
    email_id: str,
    subject: Optional[str],
    body: str,
    review_score: Optional[float] = None,
    review_feedback: Optional[str] = None,
) -> bool:
    """Update an existing email record in Supabase with newly generated content and review metadata."""
    update_payload: Dict[str, Any] = {
        "subject": subject or "Outreach Inquiry",
        "body": body,
        "status": "draft",
    }
    if review_score is not None:
        update_payload["review_score"] = review_score
    if review_feedback:
        update_payload["review_feedback"] = review_feedback

    try:
        try:
            await (
                supabase.table(table_name)
                .update(update_payload)
                .eq("id", email_id)
                .execute()
            )
        except Exception as e:
            if _is_missing_review_schema_error(e) and (
                "review_score" in update_payload or "review_feedback" in update_payload
            ):
                await (
                    supabase.table(table_name)
                    .update(_without_review_columns(update_payload))
                    .eq("id", email_id)
                    .execute()
                )
            else:
                raise
        return True
    except Exception as e:
        print(f"Warning: Failed to update existing email {email_id}: {e}")
        return False


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

    company_id = resolve_company_id(target_company)
    if not company_id:
        return {"errors": state.get("errors", []) + ["Missing company ID when storing email draft."]}

    user_id = resolve_user_id(user_context) or state.get("user_id")
    org_id = resolve_org_id(user_context, target_company) or state.get("org_id")

    try:
        supabase = await get_supabase_client()
        emails_table = os.environ.get("SUPABASE_EMAIL_TABLE_NAME", "emails")
        contacts_table = os.environ.get("SUPABASE_CONTACTS_TABLE_NAME", "contacts")

        # If an email draft for this company already exists, update it directly
        if existing_email_id:
            updated = await update_email_record(
                supabase=supabase,
                table_name=emails_table,
                email_id=existing_email_id,
                subject=generated_email.subject,
                body=generated_email.body,
                review_score=review_score,
                review_feedback=review_feedback,
            )
            if updated:
                return {"stored_email_id": existing_email_id}

        first_stored_id = None

        # If specific recipients were chosen, store draft for each selected recipient
        if recipient_emails and len(recipient_emails) > 0:
            for rec_email in recipient_emails:
                clean_email = rec_email.strip()
                c_id = None
                try:
                    c_res = await (
                        supabase.table(contacts_table)
                        .select("id")
                        .eq("company_id", company_id)
                        .ilike("email", clean_email)
                        .limit(1)
                        .execute()
                    )
                    if c_res.data and len(c_res.data) > 0:
                        c_id = c_res.data[0].get("id")
                except Exception:
                    pass

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
                stored_id = await insert_email_record(supabase, emails_table, record)
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
            first_stored_id = await insert_email_record(supabase, emails_table, record)

        return {"stored_email_id": first_stored_id}
    except Exception as e:
        error_msg = f"Failed to store email to Supabase: {str(e)}"
        print(f"Warning: {error_msg}")
        return {"errors": state.get("errors", []) + [error_msg]}
