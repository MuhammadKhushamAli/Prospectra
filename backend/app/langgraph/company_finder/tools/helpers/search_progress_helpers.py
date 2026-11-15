"""Helper functions for persisting search progress, skills, and industries in Supabase."""

from __future__ import annotations

from typing import Any, List, Optional

from app.models.search_progress import SearchProgress, SearchProgressSource
from app.utils.constants.db_tables import (
    SEARCH_PROGRESS_INDUSTRIES_TABLE,
    SEARCH_PROGRESS_SKILLS_TABLE,
    SEARCH_PROGRESS_TABLE,
)
from app.utils.helpers.time_helpers import format_timestamp
from app.utils.helpers.uuid_helpers import is_valid_uuid


def format_source_value(source: Any) -> str:
    """Normalize source into a valid SearchProgressSource string value."""
    source_val = source.value if hasattr(source, "value") else str(source)
    valid_sources = {s.value for s in SearchProgressSource}
    if source_val in valid_sources:
        return source_val
    return SearchProgressSource.SEARXNG.value


async def upsert_search_progress_record(
    supabase: Any,
    progress: SearchProgress,
) -> Optional[str]:
    """Upsert or update the primary search_progress record and return its UUID."""
    org_id = progress.org_id
    user_id = progress.user_id

    if not is_valid_uuid(org_id):
        return None

    source_val = format_source_value(progress.source)
    last_fetched_at_val = format_timestamp(progress.last_fetched_at)

    record = {
        "org_id": str(org_id),
        "source": source_val,
        "last_page_fetched": progress.last_page_fetched,
        "last_fetched_at": last_fetched_at_val,
    }
    if user_id and is_valid_uuid(user_id):
        record["user_id"] = str(user_id)

    query = (
        supabase.table(SEARCH_PROGRESS_TABLE)
        .select("id")
        .eq("org_id", str(org_id))
        .eq("source", source_val)
    )
    if user_id and is_valid_uuid(user_id):
        query = query.eq("user_id", str(user_id))

    existing = await query.execute()

    if existing.data and len(existing.data) > 0:
        progress_id = existing.data[0]["id"]
        await (
            supabase.table(SEARCH_PROGRESS_TABLE)
            .update(
                {
                    "last_page_fetched": progress.last_page_fetched,
                    "last_fetched_at": last_fetched_at_val,
                }
            )
            .eq("id", progress_id)
            .execute()
        )
        return progress_id

    inserted = await supabase.table(SEARCH_PROGRESS_TABLE).insert(record).execute()
    if inserted.data and len(inserted.data) > 0:
        return inserted.data[0].get("id")

    return None


async def sync_search_progress_skills(
    supabase: Any,
    progress_id: str,
    skill_ids: List[str],
) -> None:
    """Upsert associated skills into the search_progress_skills detail table."""
    if not progress_id or not skill_ids:
        return

    skill_records = [
        {"search_progress_id": str(progress_id), "skill_id": str(sid)}
        for sid in skill_ids
        if is_valid_uuid(sid)
    ]
    if skill_records:
        await supabase.table(SEARCH_PROGRESS_SKILLS_TABLE).upsert(skill_records).execute()


async def sync_search_progress_industries(
    supabase: Any,
    progress_id: str,
    industry_ids: List[str],
) -> None:
    """Upsert associated industries into the search_progress_industries detail table."""
    if not progress_id or not industry_ids:
        return

    industry_records = [
        {"search_progress_id": str(progress_id), "industry_id": str(iid)}
        for iid in industry_ids
        if is_valid_uuid(iid)
    ]
    if industry_records:
        await supabase.table(SEARCH_PROGRESS_INDUSTRIES_TABLE).upsert(industry_records).execute()


async def save_single_search_progress(
    supabase: Any,
    progress: SearchProgress,
) -> None:
    """Save a single SearchProgress record including its skills and industries."""
    progress_id = await upsert_search_progress_record(supabase, progress)
    if not progress_id:
        return

    if progress.skill_ids:
        await sync_search_progress_skills(supabase, progress_id, progress.skill_ids)

    if progress.industry_ids:
        await sync_search_progress_industries(supabase, progress_id, progress.industry_ids)
