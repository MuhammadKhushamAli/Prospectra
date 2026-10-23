"""Helper function for storing search progress to Supabase in the background."""

import os
import uuid
from dataclasses import asdict
from typing import Any, List

from app.models.search_progress import SearchProgress
from app.services.supabase import get_supabase_client

SEARCH_PROGRESS_TABLE = os.environ.get("SUPABASE_SEARCH_PROGRESS_TABLE_NAME", "search_progress")


def is_valid_uuid(val: Any) -> bool:
    if not val or not isinstance(val, (str, uuid.UUID)):
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


async def store_search_progress(search_progress: List[SearchProgress]) -> None:
    """Store the search progress for Apollo and Tavily to the database."""
    if not search_progress:
        return

    try:
        valid_records = []
        for progress in search_progress:
            rec = asdict(progress)
            org_id = rec.get("org_id")
            skill_target_id = rec.get("skill_target_id")

            # PostgreSQL search_progress requires non-empty valid UUID foreign keys
            if not is_valid_uuid(org_id) or not is_valid_uuid(skill_target_id):
                continue

            if rec.get("last_fetched_at") and hasattr(rec["last_fetched_at"], "isoformat"):
                rec["last_fetched_at"] = rec["last_fetched_at"].isoformat()
            valid_records.append(rec)

        if not valid_records:
            return

        supabase = await get_supabase_client()
        await supabase.table(SEARCH_PROGRESS_TABLE).upsert(valid_records).execute()

    except Exception as e:
        print(f"Warning: Failed to store search progress to Supabase: {str(e)}")

