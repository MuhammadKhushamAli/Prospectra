"""Organization domain module for team management, invites, approvals, and member administration."""

from .actor import resolve_actor_context
from .approvals_service import (
    approve_request,
    list_approvals_for_owner,
    list_my_requests,
    reject_request,
)
from .invites_service import (
    claim_invite_for_user,
    create_invite,
    list_invites,
    revoke_invite,
)
from .member_data_service import list_member_companies, list_member_emails
from .members_service import change_member_role, list_members, remove_member
from .models import (
    ActorContext,
    AdminActionResult,
    OrgActivityEventRecord,
    OrgApprovalRecord,
    OrgInviteRecord,
    OrgMemberRecord,
)
from .policies import (
    can_access_admin,
    can_change_role,
    can_decide_approval,
    can_invite,
    can_remove_member,
    can_view_teammate_data,
    compute_allowed_actions,
)

__all__ = [
    "ActorContext",
    "AdminActionResult",
    "OrgActivityEventRecord",
    "OrgApprovalRecord",
    "OrgInviteRecord",
    "OrgMemberRecord",
    "approve_request",
    "can_access_admin",
    "can_change_role",
    "can_decide_approval",
    "can_invite",
    "can_remove_member",
    "can_view_teammate_data",
    "change_member_role",
    "claim_invite_for_user",
    "compute_allowed_actions",
    "create_invite",
    "list_approvals_for_owner",
    "list_invites",
    "list_member_companies",
    "list_member_emails",
    "list_members",
    "list_my_requests",
    "reject_request",
    "resolve_actor_context",
    "revoke_invite",
]
