"""Reusable dataclasses for ARQ job statuses, webhook events, and API route responses."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, List, Optional

from app.utils.helpers.dataclass_helpers import DictCompatibleDataclass
from app.utils.helpers.time_helpers import unix_now


@dataclass(slots=True)
class JobStatusRecord(DictCompatibleDataclass):
    """Structured Redis status record for a background ARQ job."""

    job_id: str
    task_name: str
    status: str
    updated_at: int = field(default_factory=unix_now)
    error: Optional[str] = None


@dataclass(slots=True)
class JobWebhookPayload(DictCompatibleDataclass):
    """Structured webhook event payload broadcast to connected frontend WebSocket clients."""

    job_id: str
    task_name: str
    org_id: str
    status: str
    message: str
    timestamp: int = field(default_factory=unix_now)
    company_id: Optional[str] = None
    email_id: Optional[str] = None
    reply_count: Optional[int] = None
    reply_from: Optional[str] = None
    reply_subject: Optional[str] = None
    reply_snippet: Optional[str] = None
    replied_at: Optional[str] = None
    replies: Optional[List[dict[str, Any]]] = None
    error: Optional[str] = None


@dataclass(slots=True)
class CompanyStatusTransitionResponse(DictCompatibleDataclass):
    """Structured API response after accepting or rejecting a company."""

    status: str
    company_id: str
    previous_status: str
    current_status: str
    message: str
    email_job_id: Optional[str] = None
    search_job_id: Optional[str] = None


@dataclass(slots=True)
class WriteEmailRouteResponse(DictCompatibleDataclass):
    """Structured API response for synchronous email writer route execution."""

    status: str
    email_id: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    review_score: Optional[float] = None
    errors: List[str] = field(default_factory=list)
