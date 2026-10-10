"""Search progress model."""

from dataclasses import dataclass
from typing import Literal, Optional
from datetime import datetime


@dataclass
class SearchProgress:
    """Tracking progress for company searches."""
    org_id: str
    skill_target_id: str
    last_page_fetched: int
    last_fetched_at: Optional[datetime]
    source: Literal["apollo", "tavily"]
