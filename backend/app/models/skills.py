"""Skill model."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Union


@dataclass
class Skill:
    """A skill associated with an organization or user."""
    id: str
    org_id: str
    name: str
    created_at: Optional[Union[datetime, str]] = None
    user_id: Optional[str] = None
    description: Optional[str] = None


