"""Pydantic schemas and serialization helpers for organization administration routes."""

from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class InviteMemberRequest(BaseModel):
    """Payload for inviting a teammate to the organization."""

    email: str = Field(..., description="Email address of the teammate to invite")


class ChangeRoleRequest(BaseModel):
    """Payload for updating a member's role."""

    role: str = Field(..., description="Target role: 'founder' or 'member'")


class RejectApprovalRequest(BaseModel):
    """Optional payload when rejecting an approval request."""

    note: Optional[str] = Field(None, description="Optional note or reason for rejection")


class ClaimInviteRequest(BaseModel):
    """Payload for claiming an invitation after user signup."""

    token: Optional[str] = Field(None, description="Optional invite token if provided in URL")


class ActorMeResponse(BaseModel):
    """Current authenticated user's organization profile and administrative capabilities."""

    user_id: str
    user_email: str
    org_id: str
    role: str
    is_owner: bool
    is_founder: bool


class AdminActionResponse(BaseModel):
    """Standard operation response for member/invite/approval actions."""

    status: str
    message: str
    approval_id: Optional[str] = None
    member: Optional[Dict[str, Any]] = None
    invite: Optional[Dict[str, Any]] = None


__all__ = [
    "ActorMeResponse",
    "AdminActionResponse",
    "ChangeRoleRequest",
    "ClaimInviteRequest",
    "InviteMemberRequest",
    "RejectApprovalRequest",
]
