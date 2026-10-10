"""Company models."""

from dataclasses import dataclass, field
from typing import List, Optional, Literal


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
    id: str
    org_id: str
    name: str
    domain: str
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    industry: str
    size: str
    source: str
    raw_signals: Optional[dict] = None
    status: Literal["active", "inactive"]
