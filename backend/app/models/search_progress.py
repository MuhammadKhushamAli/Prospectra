"""Search progress model."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional, Union


class SearchProgressSource(str, Enum):
    """Supported search providers for company discovery."""
    SEARXNG = "searxng"
    # Legacy enum values for database backwards compatibility
    APOLLO = "apollo"
    TAVILY = "tavily"


SearchProgressSourceType = Literal["searxng"]


@dataclass
class SearchProgressSkill:
    """Association between search progress and a skill."""
    search_progress_id: str
    skill_id: str
    created_at: Optional[Union[datetime, str]] = None


@dataclass
class SearchProgressIndustry:
    """Association between search progress and a targeted industry."""
    search_progress_id: str
    industry_id: str
    created_at: Optional[Union[datetime, str]] = None


@dataclass
class SearchProgress:
    """Tracking progress for company searches."""
    org_id: str
    source: Union[SearchProgressSource, str]
    user_id: Optional[str] = None
    last_page_fetched: int = 0
    last_fetched_at: Optional[datetime] = None
    id: Optional[str] = None
    created_at: Optional[Union[datetime, str]] = None
    skill_ids: List[str] = field(default_factory=list)
    industry_ids: List[str] = field(default_factory=list)
    skill_target_id: Optional[str] = None
