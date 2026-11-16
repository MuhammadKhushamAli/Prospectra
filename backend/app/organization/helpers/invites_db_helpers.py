"""Database helpers for creating, querying, revoking, and claiming organization invitations."""

from __future__ import annotations

from datetime import timedelta
import secrets
from typing import Any, Dict, List, Optional

from app.organization.models import OrgInviteRecord
from app.utils.constants.db_tables import ORGANIZATION_INVITES_TABLE, ORGANIZATION_MEMBERS_TABLE
from app.utils.constants.org_constants import (
    INVITE_EXPIRY_DAYS,
    INVITE_STATUS_ACCEPTED,
    INVITE_STATUS_PENDING,
    INVITE_STATUS_REVOKED,
    ROLE_MEMBER,
)
from app.utils.helpers.time_helpers import utc_now, utc_now_iso


async def insert_org_invite(
    supabase: Any,
    org_id: str,
    email: str,
    invite_by: str,
) -> OrgInviteRecord:
    """Create a new pending invite record in organization_invites."""
    token = secrets.token_urlsafe(32)
    now = utc_now()
    expires_at = (now + timedelta(days=INVITE_EXPIRY_DAYS)).isoformat()
    clean_email = email.strip().lower()

    payload = {
        "org_id": org_id,
        "email": clean_email,
        "role": ROLE_MEMBER,
        "token": token,
        "status": INVITE_STATUS_PENDING,
        "invite_by": invite_by,
        "expires_at": expires_at,
        "created_at": now.isoformat(),
    }

    res = await supabase.table(ORGANIZATION_INVITES_TABLE).insert(payload).execute()
    data = res.data[0] if (res.data and len(res.data) > 0) else payload

    return OrgInviteRecord(
        id=str(data.get("id") or ""),
        org_id=org_id,
        email=clean_email,
        role=ROLE_MEMBER,
        token=token,
        status=INVITE_STATUS_PENDING,
        invite_by=invite_by,
        expires_at=expires_at,
        created_at=data.get("created_at"),
    )


async def fetch_active_org_invites(supabase: Any, org_id: str) -> List[OrgInviteRecord]:
    """Fetch all pending, non-revoked invitations for an organization."""
    now_iso = utc_now_iso()
    try:
        res = await (
            supabase.table(ORGANIZATION_INVITES_TABLE)
            .select("id, org_id, email, role, status, invite_by, expires_at, created_at")
            .eq("org_id", org_id)
            .eq("status", INVITE_STATUS_PENDING)
            .gt("expires_at", now_iso)
            .order("created_at", desc=True)
            .execute()
        )
        rows = res.data or []
        return [
            OrgInviteRecord(
                id=str(r["id"]),
                org_id=str(r["org_id"]),
                email=r["email"],
                role=r.get("role", ROLE_MEMBER),
                token="",
                status=r.get("status", INVITE_STATUS_PENDING),
                invite_by=str(r.get("invite_by") or ""),
                expires_at=r.get("expires_at"),
                created_at=r.get("created_at"),
            )
            for r in rows
        ]
    except Exception:
        return []


async def revoke_org_invite(supabase: Any, org_id: str, invite_id: str) -> bool:
    """Mark an active invitation as revoked."""
    try:
        await (
            supabase.table(ORGANIZATION_INVITES_TABLE)
            .update({"status": INVITE_STATUS_REVOKED})
            .eq("id", invite_id)
            .eq("org_id", org_id)
            .execute()
        )
        return True
    except Exception as exc:
        print(f"Warning: Failed to revoke invite in DB: {exc}")
        return False


async def fetch_invite_by_id(supabase: Any, invite_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve invite row by ID (for background email sending)."""
    try:
        res = await (
            supabase.table(ORGANIZATION_INVITES_TABLE)
            .select("*")
            .eq("id", invite_id)
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass
    return None


async def find_pending_invite_by_email(
    supabase: Any,
    email: str,
) -> Optional[Dict[str, Any]]:
    """Find a pending, unexpired invitation by user email address."""
    clean_email = (email or "").strip().lower()
    if not clean_email:
        return None

    now_iso = utc_now_iso()
    try:
        res = await (
            supabase.table(ORGANIZATION_INVITES_TABLE)
            .select("id, org_id, email, role, status, invite_by, expires_at")
            .eq("status", INVITE_STATUS_PENDING)
            .ilike("email", clean_email)
            .gt("expires_at", now_iso)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass
    return None


async def claim_invite_in_db(
    supabase: Any,
    invite_id: str,
    user_id: str,
    org_id: str,
    invite_by: Optional[str] = None,
) -> bool:
    """Insert user as member in organization_members and mark the invitation as accepted."""
    now_iso = utc_now_iso()
    try:
        # 1. Insert membership row
        member_payload = {
            "org_id": org_id,
            "user_id": user_id,
            "role": ROLE_MEMBER,
            "joined_at": now_iso,
        }
        if invite_by:
            member_payload["invited_by"] = invite_by

        await (
            supabase.table(ORGANIZATION_MEMBERS_TABLE)
            .upsert(member_payload, on_conflict="org_id,user_id")
            .execute()
        )

        # 2. Mark invitation accepted
        await (
            supabase.table(ORGANIZATION_INVITES_TABLE)
            .update({
                "status": INVITE_STATUS_ACCEPTED,
                "accepted_by": user_id,
                "accepted_at": now_iso,
            })
            .eq("id", invite_id)
            .execute()
        )
        return True
    except Exception as exc:
        print(f"Warning: Failed to claim invite in DB: {exc}")
        return False


__all__ = [
    "claim_invite_in_db",
    "fetch_active_org_invites",
    "fetch_invite_by_id",
    "find_pending_invite_by_email",
    "insert_org_invite",
    "revoke_org_invite",
]
