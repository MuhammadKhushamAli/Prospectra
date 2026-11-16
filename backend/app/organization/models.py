"""Dataclasses for organization admin, membership, invites, approvals, and activity tracking."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, List, Optional

from app.utils.helpers.dataclass_helpers import DictCompatibleDataclass


@dataclass
class ActorContext(DictCompatibleDataclass):
    """Authenticated user context within a specific organization."""

    user_id: str
    user_email: str
    org_id: str
    role: str
    is_owner: bool = False

    @property
    def is_founder(self) -> bool:
        return self.is_owner or self.role == "founder"


@dataclass
class OrgMemberRecord(DictCompatibleDataclass):
    """Team member record joined with user profile and owner status."""

    user_id: str
    org_id: str
    role: str
    joined_at: Optional[str] = None
    full_name: Optional[str] = None
    headline: Optional[str] = None
    email: Optional[str] = None
    is_owner: bool = False
    invited_by: Optional[str] = None
    allowed_actions: List[str] = field(default_factory=list)


@dataclass
class OrgInviteRecord(DictCompatibleDataclass):
    """Record representing an organization invitation."""

    id: str
    org_id: str
    email: str
    role: str = "member"
    token: str = ""
    status: str = "pending"
    invite_by: str = ""
    expires_at: Optional[str] = None
    created_at: Optional[str] = None
    accepted_by: Optional[str] = None
    accepted_at: Optional[str] = None


@dataclass
class OrgApprovalRecord(DictCompatibleDataclass):
    """Record representing an approval request for role promotion."""

    id: str
    org_id: str
    request_type: str = "role_change"
    status: str = "pending"
    requested_by: str = ""
    target_user_id: str = ""
    target_email: Optional[str] = None
    target_name: Optional[str] = None
    from_role: str = "member"
    to_role: str = "founder"
    decided_by: Optional[str] = None
    decided_at: Optional[str] = None
    decision_note: Optional[str] = None
    created_at: Optional[str] = None


@dataclass
class OrgActivityEventRecord(DictCompatibleDataclass):
    """Append-only audit and realtime activity event."""

    id: str
    org_id: str
    actor_id: Optional[str] = None
    target_user_id: Optional[str] = None
    target_email: Optional[str] = None
    event: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: Optional[str] = None


@dataclass
class AdminActionResult(DictCompatibleDataclass):
    """Standard response for admin operations (applied directly or submitted for approval)."""

    status: str
    message: str
    approval_id: Optional[str] = None
    member: Optional[dict[str, Any]] = None
    invite: Optional[dict[str, Any]] = None


__all__ = [
    "ActorContext",
    "AdminActionResult",
    "OrgActivityEventRecord",
    "OrgApprovalRecord",
    "OrgInviteRecord",
    "OrgMemberRecord",
]
