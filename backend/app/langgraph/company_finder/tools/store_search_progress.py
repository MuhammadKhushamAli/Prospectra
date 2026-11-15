"""Helper functions and modular sub-routines for storing search progress to Supabase."""

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.logging_config import get_node_logger
from app.models.search_progress import SearchProgress, SearchProgressSource
from app.services.supabase import get_supabase_client

SEARCH_PROGRESS_TABLE = os.environ.get("SUPABASE_SEARCH_PROGRESS_TABLE_NAME", "search_progress")
SEARCH_PROGRESS_SKILLS_TABLE = os.environ.get("SUPABASE_SEARCH_PROGRESS_SKILLS_TABLE_NAME", "search_progress_skills")
SEARCH_PROGRESS_INDUSTRIES_TABLE = os.environ.get("SUPABASE_SEARCH_PROGRESS_INDUSTRIES_TABLE_NAME", "search_progress_industries")
PAGES_PER_QUERY = int(os.environ.get("SEARXNG_PAGES_PER_QUERY", "2"))
MIN_SEARCH_ACCEPT_RATE = float(os.environ.get("SEARCH_MIN_ACCEPT_RATE", "0.25"))
logger = get_node_logger("company_search")


def is_valid_uuid(val: Any) -> bool:
    """Validate whether a value is a non-empty, valid UUID string or UUID object."""
    if not val or not isinstance(val, (str, uuid.UUID)):
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def format_source_value(source: Any) -> str:
    """Normalize source into a valid SearchProgressSource string value."""
    source_val = source.value if hasattr(source, "value") else str(source)
    valid_sources = {s.value for s in SearchProgressSource}
    if source_val in valid_sources:
        return source_val
    return SearchProgressSource.SEARXNG.value


def format_timestamp(timestamp: Any) -> str:
    """Format a datetime or string timestamp to ISO format string."""
    if timestamp and hasattr(timestamp, "isoformat"):
        return timestamp.isoformat()
    if isinstance(timestamp, str) and timestamp:
        return timestamp
    return datetime.now(timezone.utc).isoformat()


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

    # Check if a progress entry already exists for org_id, user_id, source
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
            .update({
                "last_page_fetched": progress.last_page_fetched,
                "last_fetched_at": last_fetched_at_val,
            })
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


async def store_search_progress(search_progress: List[SearchProgress]) -> None:
    """Store the search progress to the database."""
    if not search_progress:
        return

    try:
        supabase = await get_supabase_client()
        for progress in search_progress:
            await save_single_search_progress(supabase, progress)
    except Exception as e:
        logger.warning(f"Warning: Failed to store search progress to Supabase: {str(e)}")


async def update_search_page_progress(
    state: Any,
    success_count: int = 0,
    total_count: Optional[int] = None,
) -> Dict[str, Any]:
    """Calculate the search success rate and persist the new last page in Supabase.

    If success_rate < MIN_SEARCH_ACCEPT_RATE (25%), resets last_page_fetched to 0
    (so the next search cycle restarts at page 1). Otherwise, advances to target_last_page.
    """
    pipeline_stats = state.get("pipeline_stats")
    if not isinstance(pipeline_stats, dict):
        pipeline_stats = {}

    if pipeline_stats.get("progress_updated_in_db"):
        return {
            "last_page_fetched": pipeline_stats.get("last_page_fetched", 0),
            "success_rate": pipeline_stats.get("success_rate", 0.0),
        }

    user_context = state.get("user_context")
    org_id = (
        getattr(user_context, "org_id", "")
        if user_context and not isinstance(user_context, dict)
        else (user_context or {}).get("org_id", "")
    )

    user_id = (
        getattr(user_context, "user_id", "")
        if user_context and not isinstance(user_context, dict)
        else (user_context or {}).get("user_id", "")
    )
    target_last_page = pipeline_stats.get("target_last_page", 0)

    if total_count is None:
        total_count = (
            pipeline_stats.get("searched")
            or pipeline_stats.get("candidates")
            or len(state.get("searched_companies", []))
            or len(state.get("verified_companies", []))
            or 0
        )

    success_rate = (success_count / total_count) if total_count > 0 else 0.0

    if total_count == 0 or success_rate < MIN_SEARCH_ACCEPT_RATE:
        new_last_page = 0
        logger.info(
            f"  [PAGINATION DB UPDATE] Success rate: {success_rate:.1%} ({success_count}/{total_count}) "
            f"< {MIN_SEARCH_ACCEPT_RATE:.0%}. Resetting search page progress to 1."
        )
    else:
        new_last_page = target_last_page
        logger.info(
            f"  [PAGINATION DB UPDATE] Success rate: {success_rate:.1%} ({success_count}/{total_count}) "
            f">= {MIN_SEARCH_ACCEPT_RATE:.0%}. Advancing search page progress to {new_last_page}."
        )

    if is_valid_uuid(org_id):
        progress = SearchProgress(
            user_id=str(user_id) if is_valid_uuid(user_id) else None,
            org_id=str(org_id),
            last_page_fetched=new_last_page,
            last_fetched_at=datetime.now(timezone.utc),
            source=SearchProgressSource.SEARXNG,
        )
        await store_search_progress([progress])

    pipeline_stats["progress_updated_in_db"] = True
    pipeline_stats["last_page_fetched"] = new_last_page
    pipeline_stats["success_rate"] = round(success_rate, 4)

    return {
        "last_page_fetched": new_last_page,
        "success_rate": round(success_rate, 4),
    }


async def force_reset_search_page_to_zero(state: Any) -> None:
    """Explicitly force last_page_fetched to 0 in Supabase so the next search cycle restarts from page 1."""
    user_context = state.get("user_context") if isinstance(state, dict) else getattr(state, "user_context", None)
    org_id = (
        getattr(user_context, "org_id", "")
        if user_context and not isinstance(user_context, dict)
        else (user_context or {}).get("org_id", "")
    )

    user_id = (
        getattr(user_context, "user_id", "")
        if user_context and not isinstance(user_context, dict)
        else (user_context or {}).get("user_id", "")
    )

    if is_valid_uuid(org_id):
        progress = SearchProgress(
            user_id=str(user_id) if is_valid_uuid(user_id) else None,
            org_id=str(org_id),
            last_page_fetched=0,
            last_fetched_at=datetime.now(timezone.utc),
            source=SearchProgressSource.SEARXNG,
        )
        await store_search_progress([progress])
        logger.info(f"  [PAGINATION RETRY] Forced search page progress to 0 in DB (org={org_id}, user={user_id}).")
