"""Helper functions for building, inserting, and updating email records in Supabase."""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.models.summaries import EmailDraftRecord
from app.utils.constants.email_constants import DEFAULT_EMAIL_SUBJECT


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
    """Construct the database payload matching public.emails table schema via EmailDraftRecord."""
    draft = EmailDraftRecord(
        company_id=company_id,
        body=body,
        subject=subject or DEFAULT_EMAIL_SUBJECT,
        status="draft",
        sent_by_user_id=user_id,
        sent_by_org_id=org_id,
        contact_id=contact_id,
        review_score=review_score,
        review_feedback=review_feedback,
    )
    return draft.to_db_payload()


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
    except Exception as exc:
        if _is_missing_review_schema_error(exc) and (
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
        "subject": subject or DEFAULT_EMAIL_SUBJECT,
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
                .neq("status", "sent")
                .execute()
            )
        except Exception as exc:
            if _is_missing_review_schema_error(exc) and (
                "review_score" in update_payload or "review_feedback" in update_payload
            ):
                await (
                    supabase.table(table_name)
                    .update(_without_review_columns(update_payload))
                    .eq("id", email_id)
                    .neq("status", "sent")
                    .execute()
                )
            else:
                raise
        return True
    except Exception as exc:
        print(f"Warning: Failed to update existing email {email_id}: {exc}")
        return False


async def lookup_contact_id_by_email(
    supabase: Any,
    contacts_table: str,
    company_id: str,
    email_address: str,
) -> Optional[str]:
    """Look up a contact row ID by company_id and case-insensitive email address."""
    try:
        c_res = await (
            supabase.table(contacts_table)
            .select("id")
            .eq("company_id", company_id)
            .ilike("email", email_address.strip())
            .limit(1)
            .execute()
        )
        if c_res.data and len(c_res.data) > 0:
            return c_res.data[0].get("id")
    except Exception:
        pass
    return None
