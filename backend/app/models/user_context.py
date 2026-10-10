"""User context models."""

from dataclasses import dataclass
from typing import Optional
from .skills import Skill



@dataclass
class UserContext:
    """Profile context for the user."""
    user_id: str
    org_id: str
    full_name: str
    email: str
    skills: Optional[list[Skill]] = None