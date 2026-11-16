"""Constants, error messages, and enum values for organization and team admin management."""

from __future__ import annotations

# Organization Roles
ROLE_FOUNDER = "founder"
ROLE_MEMBER = "member"
VALID_ORG_ROLES = {ROLE_FOUNDER, ROLE_MEMBER}

# Org Approvals
APPROVAL_TYPE_ROLE_CHANGE = "role_change"
VALID_APPROVAL_TYPES = {APPROVAL_TYPE_ROLE_CHANGE}

APPROVAL_STATUS_PENDING = "pending"
APPROVAL_STATUS_APPROVED = "approved"
APPROVAL_STATUS_REJECTED = "rejected"
APPROVAL_STATUS_CANCELLED = "cancelled"
VALID_APPROVAL_STATUSES = {
    APPROVAL_STATUS_PENDING,
    APPROVAL_STATUS_APPROVED,
    APPROVAL_STATUS_REJECTED,
    APPROVAL_STATUS_CANCELLED,
}

# Org Invites
INVITE_STATUS_PENDING = "pending"
INVITE_STATUS_ACCEPTED = "accepted"
INVITE_STATUS_EXPIRED = "expired"
INVITE_STATUS_REVOKED = "revoked"
VALID_INVITE_STATUSES = {
    INVITE_STATUS_PENDING,
    INVITE_STATUS_ACCEPTED,
    INVITE_STATUS_EXPIRED,
    INVITE_STATUS_REVOKED,
}

INVITE_EXPIRY_DAYS = 7

# Activity Events
EVENT_INVITED = "invited"
EVENT_INVITE_REVOKED = "invite_revoked"
EVENT_INVITE_ACCEPTED = "invite_accepted"
EVENT_ROLE_CHANGED = "role_changed"
EVENT_MEMBER_REMOVED = "member_removed"
EVENT_APPROVAL_REQUESTED = "approval_requested"
EVENT_APPROVAL_APPROVED = "approval_approved"
EVENT_APPROVAL_REJECTED = "approval_rejected"

# Policy & Error Messages
ERR_NOT_FOUNDER = "Forbidden: only founders or organization owners can access organization administration."
ERR_NOT_OWNER = "Forbidden: only the organization owner can approve or reject role promotions."
ERR_OWNER_IMMUTABLE = "Forbidden: the organization owner's role cannot be modified or removed."
ERR_CANNOT_MODIFY_FOUNDER = "Forbidden: only the organization owner can demote or remove other founders."
ERR_DOMAIN_MISMATCH = "Domain mismatch: invited email address must belong to the organization's verified domain."
ERR_ALREADY_MEMBER = "A user with this email is already a member of the organization."
ERR_INVITE_ALREADY_EXISTS = "An active invitation for this email address already exists."
ERR_INVITE_NOT_FOUND = "Invitation not found or has already expired / been used."
ERR_APPROVAL_NOT_FOUND = "Approval request not found or has already been decided."
ERR_CANNOT_VIEW_FOUNDER_DATA = "Forbidden: only the organization owner can view data of other founders."

__all__ = [
    "APPROVAL_STATUS_APPROVED",
    "APPROVAL_STATUS_CANCELLED",
    "APPROVAL_STATUS_PENDING",
    "APPROVAL_STATUS_REJECTED",
    "APPROVAL_TYPE_ROLE_CHANGE",
    "ERR_ALREADY_MEMBER",
    "ERR_APPROVAL_NOT_FOUND",
    "ERR_CANNOT_MODIFY_FOUNDER",
    "ERR_CANNOT_VIEW_FOUNDER_DATA",
    "ERR_DOMAIN_MISMATCH",
    "ERR_INVITE_ALREADY_EXISTS",
    "ERR_INVITE_NOT_FOUND",
    "ERR_NOT_FOUNDER",
    "ERR_NOT_OWNER",
    "ERR_OWNER_IMMUTABLE",
    "EVENT_APPROVAL_APPROVED",
    "EVENT_APPROVAL_REJECTED",
    "EVENT_APPROVAL_REQUESTED",
    "EVENT_INVITED",
    "EVENT_INVITE_ACCEPTED",
    "EVENT_INVITE_REVOKED",
    "EVENT_MEMBER_REMOVED",
    "EVENT_ROLE_CHANGED",
    "INVITE_EXPIRY_DAYS",
    "INVITE_STATUS_ACCEPTED",
    "INVITE_STATUS_EXPIRED",
    "INVITE_STATUS_PENDING",
    "INVITE_STATUS_REVOKED",
    "ROLE_FOUNDER",
    "ROLE_MEMBER",
    "VALID_APPROVAL_STATUSES",
    "VALID_APPROVAL_TYPES",
    "VALID_INVITE_STATUSES",
    "VALID_ORG_ROLES",
]
