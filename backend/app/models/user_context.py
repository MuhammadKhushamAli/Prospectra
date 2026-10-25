"""User context models."""

from dataclasses import dataclass
from typing import List, Optional
from .skills import Skill


@dataclass
class UserContext:
    """Profile context for the user."""
    user_id: str
    org_id: str
    full_name: str
    email: str
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    skills: Optional[List[Skill]] = None
    target_industries: Optional[List[str]] = None