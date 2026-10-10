"""Skill model."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Skill:
    """A skill associated with a user."""
    id: str
    org_id: str
    user_id: str
    name: str
    description: Optional[str]
    category: str
    created_at: datetime
