"""Company models."""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class CompanyEmail:
    """An email associated with a company."""
    email: str
    email_of: str  # e.g., 'CEO', 'HR Manager', 'Support'
    is_verified: bool = False
    first_name: Optional[str] = None
    last_name: Optional[str] = None


@dataclass
class Company:
    """Information about a target company."""
    name: str
    web: Optional[str] = None
    emails: List[CompanyEmail] = field(default_factory=list)
    target_industry: Optional[str] = None
    target_skills: List[str] = field(default_factory=list)
    description: Optional[str] = None
    location: Optional[str] = None
    employee_count: Optional[str] = None
    linkedin_url: Optional[str] = None
