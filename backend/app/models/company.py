"""Company models."""

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from app.utils.constants.db_tables import COMPANY_DB_COLUMNS
from app.utils.constants.prospecting_constants import PENDING_STATUS


@dataclass
class CompanyEmail:
    """An email associated with a company."""

    email: str
    email_of: str  # e.g., 'Generic', 'Sales', 'Support', 'Person'
    is_verified: bool = False
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    source: str = "scraped"  # 'scraped' | 'guessed'
    is_reachable: Optional[str] = None  # 'safe' | 'risky' | 'invalid' | 'unknown'
    is_role_account: Optional[bool] = None
    is_catch_all: Optional[bool] = None


@dataclass
class ScrapedProfile:
    """Data extracted from a company's website."""

    about_text: str = ""
    meta_description: str = ""
    title: str = ""
    pages_visited: List[str] = field(default_factory=list)
    emails: List[str] = field(default_factory=list)
    phones: List[str] = field(default_factory=list)
    social_links: Dict[str, str] = field(default_factory=dict)
    address: Optional[str] = None
    fetch_ok: bool = False
    discovered_website: Optional[str] = None
    discovered_domain: Optional[str] = None
    services_offered: List[str] = field(default_factory=list)
    digital_features: List[str] = field(default_factory=list)


@dataclass
class Company:
    """Information about a target company."""

    id: str
    org_id: str
    name: str
    domain: str
    industry: str = ""
    size: str = ""
    source: str = ""
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    about_text: Optional[str] = None
    need_hypothesis: Optional[str] = None
    needed_skills: List[str] = field(default_factory=list)
    needed_services: List[str] = field(default_factory=list)
    need_signals: List[str] = field(default_factory=list)
    proposed_solution: Optional[str] = None
    services_offered: List[str] = field(default_factory=list)
    digital_features: List[str] = field(default_factory=list)
    auth_score: Optional[int] = None
    auth_feedback: Optional[str] = None
    raw_signals: Optional[dict] = None
    status: str = PENDING_STATUS

    # Pipeline-only fields (not Supabase companies table columns)
    search_snippet: str = ""
    search_query: str = ""
    scraped: Optional[ScrapedProfile] = None
    emails: List[CompanyEmail] = field(default_factory=list)


__all__ = [
    "COMPANY_DB_COLUMNS",
    "Company",
    "CompanyEmail",
    "ScrapedProfile",
]
