"""API endpoints for organization administration, member management, invites, and approvals."""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_actor, get_bearer_token
from app.api.helpers.auth_helpers import extract_user_from_token
from app.api.routes.helpers.org_admin_helpers import (
    ActorMeResponse,
    AdminActionResponse,
    ChangeRoleRequest,
    ClaimInviteRequest,
    InviteMemberRequest,
    RejectApprovalRequest,
)
from app.organization import (
    ActorContext,
    approve_request,
    change_member_role,
    claim_invite_for_user,
    create_invite,
    list_approvals_for_owner,
    list_invites,
    list_member_companies,
    list_member_emails,
    list_members,
    list_my_requests,
    reject_request,
    remove_member,
    revoke_invite,
)
from app.organization.models import OrgApprovalRecord, OrgInviteRecord, OrgMemberRecord
from app.services.supabase import get_supabase_client

router = APIRouter(tags=["organization-admin"])


@router.get("/org/{org_id}/me", response_model=ActorMeResponse)
async def get_actor_me(actor: ActorContext = Depends(get_actor)):
    """Return the current user's role and administrative capabilities within this organization."""
    return ActorMeResponse(
        user_id=actor.user_id,
        user_email=actor.user_email,
        org_id=actor.org_id,
        role=actor.role,
        is_owner=actor.is_owner,
        is_founder=actor.is_founder,
    )


@router.get("/org/{org_id}/members", response_model=List[OrgMemberRecord])
async def get_members_endpoint(actor: ActorContext = Depends(get_actor)):
    """List all members and founders of the organization with allowed actions."""
    return await list_members(actor)


@router.patch("/org/{org_id}/members/{user_id}/role", response_model=AdminActionResponse)
async def change_role_endpoint(
    user_id: str,
    body: ChangeRoleRequest,
    actor: ActorContext = Depends(get_actor),
):
    """Update a member's role (applied immediately by owner; creates approval request if non-owner founder promoting)."""
    result = await change_member_role(
        actor=actor,
        target_user_id=user_id,
        new_role=body.role,
    )
    return AdminActionResponse(
        status=result.status,
        message=result.message,
        approval_id=result.approval_id,
    )


@router.delete("/org/{org_id}/members/{user_id}", response_model=AdminActionResponse)
async def remove_member_endpoint(
    user_id: str,
    actor: ActorContext = Depends(get_actor),
):
    """Remove a teammate from the organization (immediate by any founder)."""
    result = await remove_member(actor=actor, target_user_id=user_id)
    return AdminActionResponse(
        status=result.status,
        message=result.message,
    )


@router.get("/org/{org_id}/invites", response_model=List[OrgInviteRecord])
async def get_invites_endpoint(actor: ActorContext = Depends(get_actor)):
    """List pending invitations for the organization."""
    return await list_invites(actor)


@router.post("/org/{org_id}/invites", response_model=AdminActionResponse)
async def create_invite_endpoint(
    body: InviteMemberRequest,
    actor: ActorContext = Depends(get_actor),
):
    """Invite a teammate whose email matches the verified organization domain (immediate email dispatch)."""
    result = await create_invite(actor=actor, email=body.email)
    return AdminActionResponse(
        status=result.status,
        message=result.message,
        invite=result.invite,
    )


@router.delete("/org/{org_id}/invites/{invite_id}", response_model=AdminActionResponse)
async def revoke_invite_endpoint(
    invite_id: str,
    actor: ActorContext = Depends(get_actor),
):
    """Revoke an active invitation."""
    result = await revoke_invite(actor=actor, invite_id=invite_id)
    return AdminActionResponse(
        status=result.status,
        message=result.message,
    )


@router.get("/org/{org_id}/approvals", response_model=List[OrgApprovalRecord])
async def get_owner_approvals_endpoint(actor: ActorContext = Depends(get_actor)):
    """Retrieve all pending approval requests (accessible only to organization owner)."""
    return await list_approvals_for_owner(actor)


@router.get("/org/{org_id}/my-requests", response_model=List[OrgApprovalRecord])
async def get_my_requests_endpoint(actor: ActorContext = Depends(get_actor)):
    """Retrieve requests submitted by the current actor to inspect decision status."""
    return await list_my_requests(actor)


@router.post("/org/{org_id}/approvals/{approval_id}/approve", response_model=AdminActionResponse)
async def approve_request_endpoint(
    approval_id: str,
    actor: ActorContext = Depends(get_actor),
):
    """Organization owner approves a role promotion request."""
    result = await approve_request(actor=actor, approval_id=approval_id)
    return AdminActionResponse(
        status=result.status,
        message=result.message,
        approval_id=result.approval_id,
    )


@router.post("/org/{org_id}/approvals/{approval_id}/reject", response_model=AdminActionResponse)
async def reject_request_endpoint(
    approval_id: str,
    body: RejectApprovalRequest | None = None,
    actor: ActorContext = Depends(get_actor),
):
    """Organization owner rejects a role promotion request."""
    note = body.note if body else None
    result = await reject_request(actor=actor, approval_id=approval_id, note=note)
    return AdminActionResponse(
        status=result.status,
        message=result.message,
        approval_id=result.approval_id,
    )


@router.get("/org/{org_id}/members/{user_id}/companies", response_model=List[Dict[str, Any]])
async def get_member_companies_endpoint(
    user_id: str,
    actor: ActorContext = Depends(get_actor),
):
    """Inspect companies searched and discovered by a specific team member."""
    return await list_member_companies(actor=actor, target_user_id=user_id)


@router.get("/org/{org_id}/members/{user_id}/emails", response_model=List[Dict[str, Any]])
async def get_member_emails_endpoint(
    user_id: str,
    actor: ActorContext = Depends(get_actor),
):
    """Inspect outreach emails sent by a specific team member."""
    return await list_member_emails(actor=actor, target_user_id=user_id)


@router.post("/invites/claim")
async def claim_invite_endpoint(
    body: ClaimInviteRequest | None = None,
    token: str = Depends(get_bearer_token),
):
    """Claim pending invitation for newly authenticated user and join the organization immediately."""
    supabase = await get_supabase_client()
    user_id, user_email = await extract_user_from_token(supabase, token)
    if not user_email:
        raise HTTPException(status_code=400, detail="Cannot claim invitation: user email missing from token.")

    claimed_result = await claim_invite_for_user(user_id=user_id, user_email=user_email)
    if not claimed_result:
        return {"claimed": False, "message": "No pending invitation found for your email address."}

    return {
        "claimed": True,
        "org_id": claimed_result["org_id"],
        "role": claimed_result["role"],
        "message": "Invitation claimed successfully. Welcome to the team workspace!",
    }


__all__ = ["router"]
