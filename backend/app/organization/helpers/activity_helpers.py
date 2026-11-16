"""Helper functions for logging organization administrative activity events."""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.core.logging_config import get_node_logger
from app.utils.constants.db_tables import ORG_ACTIVITY_EVENTS_TABLE
from app.utils.helpers.time_helpers import utc_now_iso

logger = get_node_logger("org_admin")


async def record_activity_event(
    supabase: Any,
    org_id: str,
    actor_id: Optional[str],
    event: str,
    target_user_id: Optional[str] = None,
    target_email: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Insert an audit activity event record into org_activity_events."""
    payload = {
        "org_id": org_id,
        "actor_id": actor_id,
        "event": event,
        "target_user_id": target_user_id,
        "target_email": target_email,
        "metadata": metadata or {},
        "created_at": utc_now_iso(),
    }
    try:
        await supabase.table(ORG_ACTIVITY_EVENTS_TABLE).insert(payload).execute()
        logger.info(f"[ORG ACTIVITY] Event '{event}' recorded for org '{org_id}' by actor '{actor_id}'.")
    except Exception as exc:
        logger.warning(f"Could not record activity event '{event}' in DB: {exc}")


__all__ = ["record_activity_event"]
