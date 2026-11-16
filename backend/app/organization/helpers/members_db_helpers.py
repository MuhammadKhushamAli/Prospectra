"""Database queries for listing, updating, and removing organization members."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.organization.models import ActorContext, OrgMemberRecord
from app.organization.policies import compute_allowed_actions
from app.utils.constants.db_tables import (
    ORGANIZATIONS_TABLE,
    ORGANIZATION_MEMBERS_TABLE,
    ORG_APPROVALS_TABLE,
    USER_PROFILES_TABLE,
)


async def fetch_org_owner_id(supabase: Any, org_id: str) -> Optional[str]:
    """Retrieve owner_id for the given organization."""
    try:
        res = await (
            supabase.table(ORGANIZATIONS_TABLE)
            .select("owner_id")
            .eq("id", org_id)
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return str(res.data[0].get("owner_id"))
    except Exception:
        pass
    return None


async def fetch_org_members_with_profiles(
    supabase: Any,
    org_id: str,
    actor: ActorContext,
) -> List[OrgMemberRecord]:
    """Fetch all organization members with joined profile details and allowed actions."""
    owner_id = await fetch_org_owner_id(supabase, org_id)

    # 1. Fetch organization members
    members_res = await (
        supabase.table(ORGANIZATION_MEMBERS_TABLE)
        .select("org_id, user_id, role, joined_at, invited_by")
        .eq("org_id", org_id)
        .order("joined_at", desc=False)
        .execute()
    )
    member_rows = members_res.data or []

    # 2. Fetch user profiles for this org
    profiles_res = await (
        supabase.table(USER_PROFILES_TABLE)
        .select("user_id, full_name, headline, email")
        .eq("org_id", org_id)
        .execute()
    )
    profile_map: Dict[str, Dict[str, Any]] = {
        str(p["user_id"]): p for p in (profiles_res.data or []) if p.get("user_id")
    }

    # 3. Fetch pending role change approvals to identify members with promotions pending
    approvals_res = await (
        supabase.table(ORG_APPROVALS_TABLE)
        .select("target_user_id")
        .eq("org_id", org_id)
        .eq("request_type", "role_change")
        .eq("status", "pending")
        .execute()
    )
    pending_target_ids = {
        str(a["target_user_id"]) for a in (approvals_res.data or []) if a.get("target_user_id")
    }

    records: List[OrgMemberRecord] = []
    for m in member_rows:
        u_id = str(m.get("user_id"))
        prof = profile_map.get(u_id) or {}
        role = str(m.get("role") or "member")
        is_owner = (owner_id is not None) and (u_id == owner_id)
        has_pending = u_id in pending_target_ids

        allowed = compute_allowed_actions(
            actor=actor,
            target_is_owner=is_owner,
            target_role=role,
            has_pending_approval=has_pending,
        )

        records.append(
            OrgMemberRecord(
                user_id=u_id,
                org_id=org_id,
                role=role,
                joined_at=m.get("joined_at"),
                full_name=prof.get("full_name") or ("Owner" if is_owner else "Teammate"),
                headline=prof.get("headline"),
                email=prof.get("email"),
                is_owner=is_owner,
                invited_by=m.get("invited_by"),
                allowed_actions=allowed,
            )
        )

    return records


async def update_member_role_in_db(
    supabase: Any,
    org_id: str,
    user_id: str,
    new_role: str,
) -> bool:
    """Update role column in organization_members table."""
    try:
        await (
            supabase.table(ORGANIZATION_MEMBERS_TABLE)
            .update({"role": new_role})
            .eq("org_id", org_id)
            .eq("user_id", user_id)
            .execute()
        )
        return True
    except Exception as exc:
        print(f"Warning: Failed to update member role in DB: {exc}")
        return False


async def delete_member_from_db(
    supabase: Any,
    org_id: str,
    user_id: str,
) -> bool:
    """Remove member record from organization_members table."""
    try:
        await (
            supabase.table(ORGANIZATION_MEMBERS_TABLE)
            .delete()
            .eq("org_id", org_id)
            .eq("user_id", user_id)
            .execute()
        )
        return True
    except Exception as exc:
        print(f"Warning: Failed to delete member from DB: {exc}")
        return False


async def fetch_member_by_user_id(
    supabase: Any,
    org_id: str,
    user_id: str,
) -> Optional[Dict[str, Any]]:
    """Fetch single member row joined with profile information."""
    try:
        m_res = await (
            supabase.table(ORGANIZATION_MEMBERS_TABLE)
            .select("org_id, user_id, role, joined_at")
            .eq("org_id", org_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not m_res.data:
            return None
        row = dict(m_res.data[0])

        p_res = await (
            supabase.table(USER_PROFILES_TABLE)
            .select("full_name, headline, email")
            .eq("org_id", org_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if p_res.data:
            row.update(p_res.data[0])
        return row
    except Exception:
        return None


__all__ = [
    "delete_member_from_db",
    "fetch_member_by_user_id",
    "fetch_org_members_with_profiles",
    "fetch_org_owner_id",
    "update_member_role_in_db",
]
