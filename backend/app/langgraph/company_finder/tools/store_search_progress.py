"""Functions for storing and updating search progress in Supabase."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.logging_config import get_node_logger
from app.langgraph.company_finder.tools.helpers.search_progress_helpers import (
    format_source_value,
    save_single_search_progress,
    sync_search_progress_industries,
    sync_search_progress_skills,
    upsert_search_progress_record,
)
from app.models.search_progress import SearchProgress, SearchProgressSource
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import (
    SEARCH_PROGRESS_INDUSTRIES_TABLE,
    SEARCH_PROGRESS_SKILLS_TABLE,
    SEARCH_PROGRESS_TABLE,
)
from app.utils.constants.prospecting_constants import (
    MIN_SEARCH_ACCEPT_RATE,
    PAGES_PER_QUERY,
)
from app.utils.helpers.state_helpers import extract_org_and_user_from_state
from app.utils.helpers.time_helpers import format_timestamp
from app.utils.helpers.uuid_helpers import is_valid_uuid

logger = get_node_logger("company_search")


async def store_search_progress(search_progress: List[SearchProgress]) -> None:
    """Store the search progress to the database."""
    if not search_progress:
        return

    try:
        supabase = await get_supabase_client()
        for progress in search_progress:
            await save_single_search_progress(supabase, progress)
    except Exception as exc:
        logger.warning(f"Warning: Failed to store search progress to Supabase: {str(exc)}")


async def update_search_page_progress(
    state: Any,
    success_count: int = 0,
    total_count: Optional[int] = None,
) -> Dict[str, Any]:
    """Calculate the search success rate and persist the new last page in Supabase."""
    pipeline_stats = state.get("pipeline_stats")
    if not isinstance(pipeline_stats, dict):
        pipeline_stats = {}

    if pipeline_stats.get("progress_updated_in_db"):
        return {
            "last_page_fetched": pipeline_stats.get("last_page_fetched", 0),
            "success_rate": pipeline_stats.get("success_rate", 0.0),
        }

    org_id, user_id = extract_org_and_user_from_state(state)
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
            f"[SEARCH PROGRESS] Qualified: {success_count}/{total_count} ({success_rate:.1%} < {MIN_SEARCH_ACCEPT_RATE:.0%}) -> reset page to 0."
        )
    else:
        new_last_page = target_last_page
        logger.info(
            f"[SEARCH PROGRESS] Qualified: {success_count}/{total_count} ({success_rate:.1%} >= {MIN_SEARCH_ACCEPT_RATE:.0%}) -> advanced page to {new_last_page}."
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
    org_id, user_id = extract_org_and_user_from_state(state)

    if is_valid_uuid(org_id):
        progress = SearchProgress(
            user_id=str(user_id) if is_valid_uuid(user_id) else None,
            org_id=str(org_id),
            last_page_fetched=0,
            last_fetched_at=datetime.now(timezone.utc),
            source=SearchProgressSource.SEARXNG,
        )
        await store_search_progress([progress])
        logger.info("[SEARCH PROGRESS] Forced search page progress to 0 in DB.")


__all__ = [
    "SEARCH_PROGRESS_TABLE",
    "SEARCH_PROGRESS_SKILLS_TABLE",
    "SEARCH_PROGRESS_INDUSTRIES_TABLE",
    "PAGES_PER_QUERY",
    "MIN_SEARCH_ACCEPT_RATE",
    "is_valid_uuid",
    "format_source_value",
    "format_timestamp",
    "upsert_search_progress_record",
    "sync_search_progress_skills",
    "sync_search_progress_industries",
    "save_single_search_progress",
    "store_search_progress",
    "update_search_page_progress",
    "force_reset_search_page_to_zero",
]
