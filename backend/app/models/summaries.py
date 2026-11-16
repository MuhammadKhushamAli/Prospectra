"""Reusable dataclasses for candidate summaries, user context summaries, email drafts, and DB records."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.models.company import Company, CompanyEmail
from app.models.user_context import UserContext
from app.utils.constants.db_tables import COMPANY_DB_COLUMNS
from app.utils.constants.email_constants import DEFAULT_EMAIL_SUBJECT
from app.utils.constants.prospecting_constants import PENDING_STATUS
from app.utils.helpers.dataclass_helpers import DictCompatibleDataclass
from app.utils.helpers.state_helpers import (
    extract_skill_names,
    extract_target_industries_list,
)


@dataclass(slots=True)
class ContactSummary(DictCompatibleDataclass):
    """Structured contact summary for a target company."""

    name: str
    role: str
    email: str

    @classmethod
    def from_company_email(cls, em: CompanyEmail) -> ContactSummary:
        """Build a ContactSummary from a CompanyEmail model."""
        full_name = f"{em.first_name or ''} {em.last_name or ''}".strip() or "Team"
        return cls(
            name=full_name,
            role=em.email_of or "Contact",
            email=em.email,
        )


@dataclass(slots=True)
class CandidateCompanySummary(DictCompatibleDataclass):
    """Structured summary of a scraped candidate company for LLM buyer-fit evaluation."""

    company_name: str
    domain: str
    website: Optional[str]
    page_title: str
    meta_description: str
    search_snippet: Optional[str]
    scraped_about_text: str
    scraped_services_offered: List[str] = field(default_factory=list)
    scraped_digital_features: List[str] = field(default_factory=list)
    verified_reachable_emails_count: int = 0

    @classmethod
    def from_company(cls, company: Company) -> CandidateCompanySummary:
        """Build a CandidateCompanySummary from a Company instance."""
        scraped = company.scraped
        return cls(
            company_name=company.name,
            domain=company.domain,
            website=company.website,
            page_title=(scraped.title if scraped else None) or company.name,
            meta_description=scraped.meta_description if scraped else "",
            search_snippet=company.search_snippet,
            scraped_about_text=(scraped.about_text if scraped else "")[:1800],
            scraped_services_offered=list(scraped.services_offered) if scraped else [],
            scraped_digital_features=list(scraped.digital_features) if scraped else [],
            verified_reachable_emails_count=len(company.emails or []),
        )


@dataclass(slots=True)
class TargetCompanySignalSummary(DictCompatibleDataclass):
    """Structured summary of an approved target company and its opportunity signals for email generation."""

    company_name: str
    domain: str
    industry: str
    website: Optional[str]
    about: Optional[str]
    need_hypothesis: Optional[str]
    needed_skills: List[str] = field(default_factory=list)
    needed_services: List[str] = field(default_factory=list)
    need_signals: List[str] = field(default_factory=list)
    proposed_solution: Optional[str] = None
    services_offered: List[str] = field(default_factory=list)
    digital_features: List[str] = field(default_factory=list)
    contacts: List[ContactSummary] = field(default_factory=list)

    @classmethod
    def from_company(cls, company: Company) -> TargetCompanySignalSummary:
        """Build a TargetCompanySignalSummary from a Company instance."""
        contacts = [
            ContactSummary.from_company_email(em)
            for em in (company.emails or [])
        ]
        return cls(
            company_name=company.name,
            domain=company.domain,
            industry=company.industry,
            website=company.website,
            about=company.about_text,
            need_hypothesis=company.need_hypothesis,
            needed_skills=list(company.needed_skills or []),
            needed_services=list(company.needed_services or []),
            need_signals=list(company.need_signals or []),
            proposed_solution=company.proposed_solution,
            services_offered=list(company.services_offered or []),
            digital_features=list(company.digital_features or []),
            contacts=contacts,
        )


@dataclass(slots=True)
class UserContextSummary(DictCompatibleDataclass):
    """Structured summary of user profile, organization, skills, and target industries for LLM prompts."""

    full_name: str
    email: str
    headline: Optional[str] = None
    organization_name: Optional[str] = None
    organization_primary_domain: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    skills: List[str] = field(default_factory=list)
    target_industries: List[str] = field(default_factory=list)

    @classmethod
    def from_user_context(cls, user_context: UserContext) -> UserContextSummary:
        """Build a UserContextSummary from a UserContext instance."""
        return cls(
            full_name=user_context.full_name,
            email=user_context.email,
            headline=getattr(user_context, "headline", None),
            organization_name=getattr(user_context, "org_name", None),
            organization_primary_domain=getattr(user_context, "org_domain", None),
            github_url=user_context.github_url,
            linkedin_url=user_context.linkedin_url,
            skills=extract_skill_names(user_context),
            target_industries=extract_target_industries_list(user_context),
        )

    def to_auth_prompt_dict(self) -> Dict[str, Any]:
        """Return compact user summary dictionary for company authentication prompts."""
        return {
            "user_name": self.full_name,
            "user_skills": self.skills,
            "target_industries": self.target_industries,
        }


@dataclass(slots=True)
class ExistingEmailSummary(DictCompatibleDataclass):
    """Summary of an existing email draft or sent email stored in Supabase."""

    id: Optional[str]
    subject: Optional[str]
    body: Optional[str]
    status: Optional[str]

    @classmethod
    def from_record(cls, record: Dict[str, Any]) -> ExistingEmailSummary:
        """Instantiate an ExistingEmailSummary from a raw database row."""
        return cls(
            id=record.get("id"),
            subject=record.get("subject"),
            body=record.get("body"),
            status=record.get("status"),
        )


@dataclass(slots=True)
class EmailDraftRecord(DictCompatibleDataclass):
    """Structured database payload for inserting or updating public.emails rows."""

    company_id: str
    body: str
    subject: str = DEFAULT_EMAIL_SUBJECT
    status: str = "draft"
    sent_by_user_id: Optional[str] = None
    sent_by_org_id: Optional[str] = None
    contact_id: Optional[str] = None
    review_score: Optional[float] = None
    review_feedback: Optional[str] = None

    def to_db_payload(self) -> Dict[str, Any]:
        """Serialize non-null fields into a Supabase insert/update dictionary."""
        payload: Dict[str, Any] = {
            "company_id": self.company_id,
            "body": self.body,
            "subject": self.subject or DEFAULT_EMAIL_SUBJECT,
            "status": self.status,
        }
        if self.sent_by_user_id:
            payload["sent_by_user_id"] = self.sent_by_user_id
        if self.sent_by_org_id:
            payload["sent_by_org_id"] = self.sent_by_org_id
        if self.contact_id:
            payload["contact_id"] = self.contact_id
        if self.review_score is not None:
            payload["review_score"] = self.review_score
        if self.review_feedback:
            payload["review_feedback"] = self.review_feedback
        return payload


@dataclass(slots=True)
class CompanyDatabaseRecord(DictCompatibleDataclass):
    """Structured database row representation for public.companies."""

    id: str
    org_id: str
    name: str
    domain: str
    website: str
    linkedin_url: Optional[str] = None
    industry: str = ""
    size: str = ""
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
    source: List[str] = field(default_factory=lambda: ["searxng"])
    raw_signals: Dict[str, Any] = field(default_factory=dict)
    status: str = PENDING_STATUS
    discovered_by_user_id: Optional[str] = None

    @classmethod
    def from_company(
        cls,
        company: Company,
        discovered_by_user_id: Optional[str] = None,
    ) -> CompanyDatabaseRecord:
        """Construct a CompanyDatabaseRecord from an accepted Company model."""
        return cls(
            id=str(company.id),
            org_id=str(company.org_id),
            name=company.name,
            domain=company.domain,
            website=company.website or f"https://{company.domain}",
            linkedin_url=company.linkedin_url,
            industry=company.industry or "",
            size=company.size or "",
            about_text=company.about_text or (company.scraped.about_text if company.scraped else None),
            need_hypothesis=company.need_hypothesis,
            needed_skills=list(company.needed_skills or []),
            needed_services=list(company.needed_services or []),
            need_signals=list(company.need_signals or []),
            proposed_solution=company.proposed_solution,
            services_offered=list(
                company.services_offered or (company.scraped.services_offered if company.scraped else [])
            ),
            digital_features=list(
                company.digital_features or (company.scraped.digital_features if company.scraped else [])
            ),
            auth_score=company.auth_score,
            auth_feedback=company.auth_feedback,
            source=["searxng"],
            raw_signals=dict(company.raw_signals or {}),
            status=PENDING_STATUS,
            discovered_by_user_id=discovered_by_user_id,
        )

    def to_db_payload(self) -> Dict[str, Any]:
        """Serialize strictly to allowed public.companies table columns."""
        raw = self.to_dict()
        return {k: v for k, v in raw.items() if k in COMPANY_DB_COLUMNS}


@dataclass(slots=True)
class ContactDatabaseRecord(DictCompatibleDataclass):
    """Structured database row representation for public.contacts."""

    company_id: str
    email: str
    role: str = "Generic"
    name: Optional[str] = None
    source: str = "reacher:scraped"
    is_reachable: str = "safe"
    is_role_account: Optional[bool] = None
    verified_at: Optional[str] = None

    @classmethod
    def from_company_email(
        cls,
        company_id: str,
        email_obj: CompanyEmail,
        verified_at: str,
    ) -> ContactDatabaseRecord:
        """Construct a ContactDatabaseRecord from a verified CompanyEmail instance."""
        full_name = f"{email_obj.first_name or ''} {email_obj.last_name or ''}".strip() or None
        return cls(
            company_id=company_id,
            name=full_name,
            role=email_obj.email_of or "Generic",
            email=email_obj.email.lower().strip(),
            source=f"reacher:{email_obj.source}",
            is_reachable=email_obj.is_reachable or "safe",
            is_role_account=email_obj.is_role_account,
            verified_at=verified_at,
        )
