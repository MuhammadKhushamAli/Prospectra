"""Data models for Prospectra."""

from .company import Company, CompanyEmail
from .job_models import (
    CompanyStatusTransitionResponse,
    JobStatusRecord,
    JobWebhookPayload,
    WriteEmailRouteResponse,
)
from .search_progress import (
    SearchProgress,
    SearchProgressIndustry,
    SearchProgressSkill,
    SearchProgressSource,
)
from .skills import Skill
from .summaries import (
    CandidateCompanySummary,
    CompanyDatabaseRecord,
    ContactDatabaseRecord,
    ContactSummary,
    EmailDraftRecord,
    ExistingEmailSummary,
    TargetCompanySignalSummary,
    UserContextSummary,
)
from .user_context import UserContext

__all__ = [
    "Company",
    "CompanyEmail",
    "CompanyStatusTransitionResponse",
    "JobStatusRecord",
    "JobWebhookPayload",
    "WriteEmailRouteResponse",
    "SearchProgress",
    "SearchProgressIndustry",
    "SearchProgressSkill",
    "SearchProgressSource",
    "Skill",
    "CandidateCompanySummary",
    "CompanyDatabaseRecord",
    "ContactDatabaseRecord",
    "ContactSummary",
    "EmailDraftRecord",
    "ExistingEmailSummary",
    "TargetCompanySignalSummary",
    "UserContextSummary",
    "UserContext",
]
