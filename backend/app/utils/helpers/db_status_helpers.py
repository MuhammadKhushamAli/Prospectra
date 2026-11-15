"""Shared database status check and safe status mutation helpers used across routes, workers, and graphs."""

from typing import Any, Dict, Optional

from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import COMPANIES_TABLE, EMAILS_TABLE
from app.utils.constants.prospecting_constants import PENDING_STATUS


def is_email_sent(email_record: Optional[Dict[str, Any]]) -> bool:
    """Return True when an email record's status is 'sent'."""
    if not email_record or not isinstance(email_record, dict):
        return False
    return str(email_record.get("status") or "").strip().lower() == "sent"


def is_email_already_generated(email_record: Optional[Dict[str, Any]]) -> bool:
    """Return True when an email record already exists for the company."""
    if not email_record or not isinstance(email_record, dict):
        return False
    return bool(email_record.get("id"))


async def set_email_status_safe(email_id: str, status: str) -> None:
    """Safely update an email's status in Supabase (e.g. 'approved' while sending, or revert to 'draft')."""
    try:
        supabase = await get_supabase_client()
        await supabase.table(EMAILS_TABLE).update({"status": status}).eq("id", email_id).execute()
    except Exception:
        pass


async def revert_email_to_draft_safe(email_id: str) -> None:
    """Revert an email's status back to 'draft' (Pending) if worker SMTP dispatch fails."""
    await set_email_status_safe(email_id, "draft")


async def revert_company_status_to_pending(
    company_id: str,
    org_id: Optional[str] = None,
    pending_status: str = PENDING_STATUS,
) -> None:
    """Reset company status back to pending in the database if email generation fails."""
    try:
        supabase = await get_supabase_client()
        query = supabase.table(COMPANIES_TABLE).update({"status": pending_status}).eq("id", company_id)
        if org_id:
            query = query.eq("org_id", org_id)
        await query.execute()
    except Exception as exc:
        print(f"Warning: Failed to revert company {company_id} status to {pending_status} in DB: {exc}")
