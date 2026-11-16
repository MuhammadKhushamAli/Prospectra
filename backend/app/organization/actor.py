"""Actor context resolution from Supabase auth token and organization membership."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.api.helpers.auth_helpers import extract_user_from_token
from app.organization.models import ActorContext
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import ORGANIZATIONS_TABLE, ORGANIZATION_MEMBERS_TABLE


async def resolve_actor_context(token: str, org_id: str, supabase: Any = None) -> ActorContext:
    """Validate token and resolve ActorContext with role and owner status."""
    client = supabase or await get_supabase_client()
    user_id, user_email = await extract_user_from_token(client, token)

    # 1. Check if user is the organization owner
    org_res = await (
        client.table(ORGANIZATIONS_TABLE)
        .select("id, owner_id")
        .eq("id", org_id)
        .limit(1)
        .execute()
    )
    if not org_res.data:
        raise HTTPException(status_code=404, detail=f"Organization '{org_id}' not found.")

    is_owner = str(org_res.data[0].get("owner_id")) == str(user_id)

    # 2. Check organization membership role
    member_res = await (
        client.table(ORGANIZATION_MEMBERS_TABLE)
        .select("role")
        .eq("org_id", org_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if member_res.data and len(member_res.data) > 0:
        role = member_res.data[0].get("role", "member")
    elif is_owner:
        role = "founder"
    else:
        raise HTTPException(
            status_code=403,
            detail=f"User is not a member of organization '{org_id}'.",
        )

    return ActorContext(
        user_id=user_id,
        user_email=user_email or "",
        org_id=org_id,
        role=role,
        is_owner=is_owner,
    )


__all__ = ["resolve_actor_context"]
