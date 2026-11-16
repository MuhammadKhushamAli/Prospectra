"""Domain service for managing organization owner approval requests and decisions."""

from __future__ import annotations

from typing import List, Optional

from fastapi import HTTPException

from app.organization.helpers.activity_helpers import record_activity_event
from app.organization.helpers.approvals_db_helpers import (
    fetch_my_requested_approvals,
    fetch_pending_org_approvals,
    lock_and_decide_approval,
)
from app.organization.helpers.members_db_helpers import update_member_role_in_db
from app.organization.models import ActorContext, AdminActionResult, OrgApprovalRecord
from app.organization.policies import can_access_admin, can_decide_approval
from app.services.supabase import get_supabase_client
from app.utils.constants.org_constants import (
    APPROVAL_STATUS_APPROVED,
    APPROVAL_STATUS_REJECTED,
    ERR_APPROVAL_NOT_FOUND,
    ERR_NOT_FOUNDER,
    EVENT_APPROVAL_APPROVED,
    EVENT_APPROVAL_REJECTED,
    EVENT_ROLE_CHANGED,
    ROLE_FOUNDER,
)


async def list_approvals_for_owner(actor: ActorContext) -> List[OrgApprovalRecord]:
    """Retrieve all pending approval requests for the organization owner."""
    allowed, err = can_decide_approval(actor)
    if not allowed:
        raise HTTPException(status_code=403, detail=err)

    supabase = await get_supabase_client()
    return await fetch_pending_org_approvals(supabase, actor.org_id)


async def list_my_requests(actor: ActorContext) -> List[OrgApprovalRecord]:
    """Retrieve requests submitted by the current actor (for My Requests status tracking)."""
    if not can_access_admin(actor):
        raise HTTPException(status_code=403, detail=ERR_NOT_FOUNDER)

    supabase = await get_supabase_client()
    return await fetch_my_requested_approvals(supabase, actor.org_id, actor.user_id)


async def approve_request(actor: ActorContext, approval_id: str) -> AdminActionResult:
    """Owner approves a role promotion request, immediately applying the founder role."""
    allowed, err = can_decide_approval(actor)
    if not allowed:
        raise HTTPException(status_code=403, detail=err)

    supabase = await get_supabase_client()
    updated = await lock_and_decide_approval(
        supabase=supabase,
        approval_id=approval_id,
        org_id=actor.org_id,
        new_status=APPROVAL_STATUS_APPROVED,
        decided_by=actor.user_id,
    )
    if not updated:
        raise HTTPException(status_code=400, detail=ERR_APPROVAL_NOT_FOUND)

    target_user_id = str(updated.get("target_user_id") or "")
    if target_user_id:
        await update_member_role_in_db(supabase, actor.org_id, target_user_id, ROLE_FOUNDER)
        await record_activity_event(
            supabase=supabase,
            org_id=actor.org_id,
            actor_id=actor.user_id,
            event=EVENT_ROLE_CHANGED,
            target_user_id=target_user_id,
            target_email=updated.get("target_email"),
            metadata={"from_role": "member", "to_role": "founder", "via_approval_id": approval_id},
        )

    await record_activity_event(
        supabase=supabase,
        org_id=actor.org_id,
        actor_id=actor.user_id,
        event=EVENT_APPROVAL_APPROVED,
        target_user_id=target_user_id,
        target_email=updated.get("target_email"),
        metadata={"approval_id": approval_id},
    )

    return AdminActionResult(
        status="applied",
        message="Approval granted. Teammate has been promoted to Founder.",
        approval_id=approval_id,
    )


async def reject_request(
    actor: ActorContext,
    approval_id: str,
    note: Optional[str] = None,
) -> AdminActionResult:
    """Owner rejects a role promotion request."""
    allowed, err = can_decide_approval(actor)
    if not allowed:
        raise HTTPException(status_code=403, detail=err)

    supabase = await get_supabase_client()
    updated = await lock_and_decide_approval(
        supabase=supabase,
        approval_id=approval_id,
        org_id=actor.org_id,
        new_status=APPROVAL_STATUS_REJECTED,
        decided_by=actor.user_id,
        note=note,
    )
    if not updated:
        raise HTTPException(status_code=400, detail=ERR_APPROVAL_NOT_FOUND)

    await record_activity_event(
        supabase=supabase,
        org_id=actor.org_id,
        actor_id=actor.user_id,
        event=EVENT_APPROVAL_REJECTED,
        target_user_id=updated.get("target_user_id"),
        target_email=updated.get("target_email"),
        metadata={"approval_id": approval_id, "note": note},
    )

    return AdminActionResult(
        status="applied",
        message="Approval request rejected.",
        approval_id=approval_id,
    )


__all__ = [
    "approve_request",
    "list_approvals_for_owner",
    "list_my_requests",
    "reject_request",
]
