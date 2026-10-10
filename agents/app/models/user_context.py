"""User context models."""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class UserSkills:
    """Skills possessed by the user."""
    category: str
    programming_languages: List[str] = field(default_factory=list)
    frameworks: List[str] = field(default_factory=list)
    tools: List[str] = field(default_factory=list)


@dataclass
class UserContext:
    """Profile context for the user."""
    user_id: str
    name: str
    email: str
    skills: UserSkills
    job_title: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
