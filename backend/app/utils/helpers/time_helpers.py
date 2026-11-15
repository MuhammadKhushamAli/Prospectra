"""Shared date and timestamp formatting helpers used across multiple backend modules."""

from datetime import datetime, timezone
import time
from typing import Any


def utc_now() -> datetime:
    """Return current UTC datetime."""
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    """Return current UTC datetime formatted as an ISO-8601 string."""
    return utc_now().isoformat()


def format_timestamp(timestamp: Any) -> str:
    """Format a datetime or string timestamp to an ISO-8601 string."""
    if timestamp and hasattr(timestamp, "isoformat"):
        return timestamp.isoformat()
    if isinstance(timestamp, str) and timestamp:
        return timestamp
    return utc_now_iso()


def unix_now() -> float:
    """Return current Unix epoch timestamp in seconds."""
    return time.time()
