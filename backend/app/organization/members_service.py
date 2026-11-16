"""Domain service for managing organization team members and role transitions."""

from __future__ import annotations

from typing import List

from fastapi import HTTPException

from app.organization.helpers.activity_helpers import record_activity_event
from app.organization.helpers.approvals_db_helpers import insert_role_change_approval
from app.organization.helpers.members_db_helpers import (
    delete_member_from_db,
    fetch_member_by_user_id,
    fetch_org_members_with_profiles,
    fetch_org_owner_id,
    update_member_role_in_db,
)
from app.organization.models import ActorContext, AdminActionResult, OrgMemberRecord
from app.organization.policies import (
    POLICY_ALLOW_IMMEDIATE,
    POLICY_REQUIRES_APPROVAL,
    can_access_admin,
    can_change_role,
    can_remove_member,
)
from app.services.supabase import get_supabase_client
from app.utils.constants.org_constants import (
    ERR_NOT_FOUNDER,
    EVENT_APPROVAL_REQUESTED,
    EVENT_MEMBER_REMOVED,
    EVENT_ROLE_CHANGED,
    ROLE_FOUNDER,
)


async def list_members(actor: ActorContext) -> List[OrgMemberRecord]:
    """Retrieve all organization members with role metadata and permissions."""
    if not can_access_admin(actor):
        raise HTTPException(status_code=403, detail=ERR_NOT_FOUNDER)

    supabase = await get_supabase_client()
    return await fetch_org_members_with_profiles(supabase, actor.org_id, actor)


async def change_member_role(
    actor: ActorContext,
    target_user_id: str,
    new_role: str,
) -> AdminActionResult:
    """Promote or demote a member. Applies immediately if owner; requires approval if non-owner founder promoting."""
    supabase = await get_supabase_client()
    target_member = await fetch_member_by_user_id(supabase, actor.org_id, target_user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Target user is not a member of this organization.")

    owner_id = await fetch_org_owner_id(supabase, actor.org_id)
    target_is_owner = (owner_id is not None) and (target_user_id == owner_id)
    current_role = target_member.get("role", "member")

    decision, error_msg = can_change_role(
        actor=actor,
        target_is_owner=target_is_owner,
        current_role=current_role,
        target_role=new_role,
    )

    if decision == POLICY_ALLOW_IMMEDIATE:
        success = await update_member_role_in_db(supabase, actor.org_id, target_user_id, new_role)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update member role in database.")

        await record_activity_event(
            supabase=supabase,
            org_id=actor.org_id,
            actor_id=actor.user_id,
            event=EVENT_ROLE_CHANGED,
            target_user_id=target_user_id,
            target_email=target_member.get("email"),
            metadata={"from_role": current_role, "to_role": new_role},
        )
        return AdminActionResult(
            status="applied",
            message=f"Role updated to '{new_role}' successfully.",
        )

    if decision == POLICY_REQUIRES_APPROVAL:
        approval_rec = await insert_role_change_approval(
            supabase=supabase,
            org_id=actor.org_id,
            requested_by=actor.user_id,
            target_user_id=target_user_id,
            target_email=target_member.get("email"),
            target_name=target_member.get("full_name"),
        )
        await record_activity_event(
            supabase=supabase,
            org_id=actor.org_id,
            actor_id=actor.user_id,
            event=EVENT_APPROVAL_REQUESTED,
            target_user_id=target_user_id,
            target_email=target_member.get("email"),
            metadata={"from_role": current_role, "to_role": new_role, "approval_id": approval_rec.id},
        )
        return AdminActionResult(
            status="pending_approval",
            message="Promotion to Founder submitted for organization owner approval.",
            approval_id=approval_rec.id,
        )

    raise HTTPException(status_code=403, detail=error_msg or "Cannot perform role change.")


async def remove_member(actor: ActorContext, target_user_id: str) -> AdminActionResult:
    """Remove a teammate from the organization (immediate, no approval needed for members)."""
    supabase = await get_supabase_client()
    target_member = await fetch_member_by_user_id(supabase, actor.org_id, target_user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Target user is not a member of this organization.")

    owner_id = await fetch_org_owner_id(supabase, actor.org_id)
    target_is_owner = (owner_id is not None) and (target_user_id == owner_id)
    target_role = target_member.get("role", "member")

    allowed, err = can_remove_member(actor, target_is_owner, target_role)
    if not allowed:
        raise HTTPException(status_code=403, detail=err)

    success = await delete_member_from_db(supabase, actor.org_id, target_user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to remove member from database.")

    await record_activity_event(
        supabase=supabase,
        org_id=actor.org_id,
        actor_id=actor.user_id,
        event=EVENT_MEMBER_REMOVED,
        target_user_id=target_user_id,
        target_email=target_member.get("email"),
        metadata={"role": target_role},
    )

    return AdminActionResult(
        status="applied",
        message="Member removed from organization successfully.",
    )


__all__ = ["change_member_role", "list_members", "remove_member"]
