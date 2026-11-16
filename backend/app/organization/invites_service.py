"""Domain service for managing organization invitations and claiming on user signup."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from app.core.arq_config import enqueue_arq_job
from app.organization.helpers.activity_helpers import record_activity_event
from app.organization.helpers.domain_match_helpers import (
    fetch_org_verified_domain,
    verify_email_matches_org_domain,
)
from app.organization.helpers.invites_db_helpers import (
    claim_invite_in_db,
    fetch_active_org_invites,
    find_pending_invite_by_email,
    insert_org_invite,
    revoke_org_invite,
)
from app.organization.models import ActorContext, AdminActionResult, OrgInviteRecord
from app.organization.policies import can_access_admin, can_invite
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import USER_PROFILES_TABLE
from app.utils.constants.org_constants import (
    ERR_ALREADY_MEMBER,
    ERR_DOMAIN_MISMATCH,
    ERR_INVITE_ALREADY_EXISTS,
    ERR_NOT_FOUNDER,
    EVENT_INVITED,
    EVENT_INVITE_ACCEPTED,
    EVENT_INVITE_REVOKED,
)


async def list_invites(actor: ActorContext) -> List[OrgInviteRecord]:
    """Retrieve all pending invitations for the organization."""
    if not can_access_admin(actor):
        raise HTTPException(status_code=403, detail=ERR_NOT_FOUNDER)

    supabase = await get_supabase_client()
    return await fetch_active_org_invites(supabase, actor.org_id)


async def create_invite(actor: ActorContext, email: str) -> AdminActionResult:
    """Create a new teammate invitation and dispatch the invitation email immediately."""
    allowed, err = can_invite(actor)
    if not allowed:
        raise HTTPException(status_code=403, detail=err)

    clean_email = (email or "").strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    supabase = await get_supabase_client()

    # 1. Validate that email domain matches the verified organization domain
    verified_domain = await fetch_org_verified_domain(supabase, actor.org_id)
    if not verified_domain or not verify_email_matches_org_domain(clean_email, verified_domain):
        raise HTTPException(
            status_code=400,
            detail=(
                f"{ERR_DOMAIN_MISMATCH} Email must end with '@{verified_domain or 'your-verified-domain'}'."
            ),
        )

    # 2. Check if user is already a member of this organization
    try:
        existing_profile = await (
            supabase.table(USER_PROFILES_TABLE)
            .select("user_id")
            .eq("org_id", actor.org_id)
            .ilike("email", clean_email)
            .limit(1)
            .execute()
        )
        if existing_profile.data and len(existing_profile.data) > 0:
            raise HTTPException(status_code=400, detail=ERR_ALREADY_MEMBER)
    except HTTPException:
        raise
    except Exception:
        pass

    # 3. Check if active pending invite already exists
    active_invites = await fetch_active_org_invites(supabase, actor.org_id)
    if any(i.email.lower() == clean_email for i in active_invites):
        raise HTTPException(status_code=400, detail=ERR_INVITE_ALREADY_EXISTS)

    # 4. Insert invite record into database
    invite_rec = await insert_org_invite(
        supabase=supabase,
        org_id=actor.org_id,
        email=clean_email,
        invite_by=actor.user_id,
    )

    # 5. Enqueue background email dispatch task
    try:
        await enqueue_arq_job(
            "send_org_invite_email_task",
            invite_rec.id,
            actor.user_id,
        )
    except Exception as q_err:
        print(f"Warning: Could not enqueue send_org_invite_email_task: {q_err}")

    # 6. Record activity audit event
    await record_activity_event(
        supabase=supabase,
        org_id=actor.org_id,
        actor_id=actor.user_id,
        event=EVENT_INVITED,
        target_email=clean_email,
        metadata={"invite_id": invite_rec.id},
    )

    return AdminActionResult(
        status="applied",
        message=f"Invitation sent to {clean_email}.",
        invite=invite_rec.to_dict(),
    )


async def revoke_invite(actor: ActorContext, invite_id: str) -> AdminActionResult:
    """Revoke an active invitation."""
    if not can_access_admin(actor):
        raise HTTPException(status_code=403, detail=ERR_NOT_FOUNDER)

    supabase = await get_supabase_client()
    success = await revoke_org_invite(supabase, actor.org_id, invite_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to revoke invitation.")

    await record_activity_event(
        supabase=supabase,
        org_id=actor.org_id,
        actor_id=actor.user_id,
        event=EVENT_INVITE_REVOKED,
        metadata={"invite_id": invite_id},
    )

    return AdminActionResult(
        status="applied",
        message="Invitation revoked successfully.",
    )


async def claim_invite_for_user(user_id: str, user_email: str) -> Optional[Dict[str, Any]]:
    """Check for a pending invitation for a newly registered user and claim it."""
    supabase = await get_supabase_client()
    invite = await find_pending_invite_by_email(supabase, user_email)
    if not invite:
        return None

    invite_id = str(invite["id"])
    org_id = str(invite["org_id"])
    invite_by = str(invite.get("invite_by") or "")

    claimed = await claim_invite_in_db(
        supabase=supabase,
        invite_id=invite_id,
        user_id=user_id,
        org_id=org_id,
        invite_by=invite_by,
    )
    if claimed:
        await record_activity_event(
            supabase=supabase,
            org_id=org_id,
            actor_id=user_id,
            event=EVENT_INVITE_ACCEPTED,
            target_user_id=user_id,
            target_email=user_email,
            metadata={"invite_id": invite_id},
        )
        return {
            "org_id": org_id,
            "role": "member",
            "claimed": True,
        }
    return None


__all__ = [
    "claim_invite_for_user",
    "create_invite",
    "list_invites",
    "revoke_invite",
]
