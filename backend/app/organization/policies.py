"""Pure policy rules for organization administration, role changes, invites, and data access."""

from __future__ import annotations

from typing import List, Tuple

from app.organization.models import ActorContext
from app.utils.constants.org_constants import (
    ERR_CANNOT_MODIFY_FOUNDER,
    ERR_CANNOT_VIEW_FOUNDER_DATA,
    ERR_NOT_FOUNDER,
    ERR_NOT_OWNER,
    ERR_OWNER_IMMUTABLE,
    ROLE_FOUNDER,
    ROLE_MEMBER,
)

POLICY_ALLOW_IMMEDIATE = "allow_immediate"
POLICY_REQUIRES_APPROVAL = "requires_approval"
POLICY_DENY = "deny"


def can_access_admin(actor: ActorContext) -> bool:
    """Return True if actor has founder/owner privileges."""
    return actor.is_founder


def can_invite(actor: ActorContext) -> Tuple[bool, str]:
    """Check if actor is permitted to invite same-domain members."""
    if not actor.is_founder:
        return False, ERR_NOT_FOUNDER
    return True, ""


def can_remove_member(
    actor: ActorContext,
    target_is_owner: bool,
    target_role: str,
) -> Tuple[bool, str]:
    """Check if actor is permitted to remove a member or founder."""
    if not actor.is_founder:
        return False, ERR_NOT_FOUNDER
    if target_is_owner:
        return False, ERR_OWNER_IMMUTABLE
    if target_role == ROLE_FOUNDER and not actor.is_owner:
        return False, ERR_CANNOT_MODIFY_FOUNDER
    return True, ""


def can_change_role(
    actor: ActorContext,
    target_is_owner: bool,
    current_role: str,
    target_role: str,
) -> Tuple[str, str]:
    """Evaluate role change request and return decision status (immediate, approval, or deny)."""
    if not actor.is_founder:
        return POLICY_DENY, ERR_NOT_FOUNDER
    if target_is_owner:
        return POLICY_DENY, ERR_OWNER_IMMUTABLE
    if current_role == target_role:
        return POLICY_DENY, f"Target user already has the '{target_role}' role."

    # Org owner can change any role immediately
    if actor.is_owner:
        return POLICY_ALLOW_IMMEDIATE, ""

    # Non-owner founder trying to demote a founder is strictly forbidden
    if current_role == ROLE_FOUNDER:
        return POLICY_DENY, ERR_CANNOT_MODIFY_FOUNDER

    # Non-owner founder promoting a member to founder requires owner approval
    if current_role == ROLE_MEMBER and target_role == ROLE_FOUNDER:
        return POLICY_REQUIRES_APPROVAL, ""

    return POLICY_DENY, "Invalid role transition."


def can_decide_approval(actor: ActorContext) -> Tuple[bool, str]:
    """Only the organization owner can approve or reject approval requests."""
    if not actor.is_owner:
        return False, ERR_NOT_OWNER
    return True, ""


def can_view_teammate_data(
    actor: ActorContext,
    target_is_owner: bool,
    target_role: str,
) -> Tuple[bool, str]:
    """Founders can view member data; only the org owner can view founder data."""
    if not actor.is_founder:
        return False, ERR_NOT_FOUNDER
    if target_is_owner or target_role == ROLE_FOUNDER:
        if not actor.is_owner:
            return False, ERR_CANNOT_VIEW_FOUNDER_DATA
    return True, ""


def compute_allowed_actions(
    actor: ActorContext,
    target_is_owner: bool,
    target_role: str,
    has_pending_approval: bool = False,
) -> List[str]:
    """Return explicit list of allowed action keys for UI rendering for a given member row."""
    actions: List[str] = []
    if not actor.is_founder:
        return actions

    # Data inspection
    can_view, _ = can_view_teammate_data(actor, target_is_owner, target_role)
    if can_view:
        actions.append("view_companies")
        actions.append("view_emails")

    # Owners cannot be modified or removed by anyone
    if target_is_owner:
        return actions

    # Non-owner founders cannot modify other founders
    if target_role == ROLE_FOUNDER and not actor.is_owner:
        return actions

    # Promotion / Demotion
    if target_role == ROLE_MEMBER:
        if not has_pending_approval:
            actions.append("promote_to_founder")
    elif target_role == ROLE_FOUNDER and actor.is_owner:
        actions.append("demote_to_member")

    # Removal
    actions.append("remove_member")

    return actions


__all__ = [
    "POLICY_ALLOW_IMMEDIATE",
    "POLICY_DENY",
    "POLICY_REQUIRES_APPROVAL",
    "can_access_admin",
    "can_change_role",
    "can_decide_approval",
    "can_invite",
    "can_remove_member",
    "can_view_teammate_data",
    "compute_allowed_actions",
]
