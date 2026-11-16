"""Database helpers for creating, querying, and updating role promotion approval requests."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.organization.models import OrgApprovalRecord
from app.utils.constants.db_tables import ORG_APPROVALS_TABLE, USER_PROFILES_TABLE
from app.utils.constants.org_constants import (
    APPROVAL_STATUS_PENDING,
    APPROVAL_TYPE_ROLE_CHANGE,
    ROLE_FOUNDER,
    ROLE_MEMBER,
)
from app.utils.helpers.time_helpers import utc_now_iso


async def insert_role_change_approval(
    supabase: Any,
    org_id: str,
    requested_by: str,
    target_user_id: str,
    target_email: Optional[str] = None,
    target_name: Optional[str] = None,
) -> OrgApprovalRecord:
    """Insert a pending role promotion approval request into org_approvals."""
    now_iso = utc_now_iso()
    payload = {
        "org_id": org_id,
        "request_type": APPROVAL_TYPE_ROLE_CHANGE,
        "status": APPROVAL_STATUS_PENDING,
        "requested_by": requested_by,
        "target_user_id": target_user_id,
        "target_email": target_email,
        "from_role": ROLE_MEMBER,
        "to_role": ROLE_FOUNDER,
        "created_at": now_iso,
    }

    res = await supabase.table(ORG_APPROVALS_TABLE).insert(payload).execute()
    data = res.data[0] if (res.data and len(res.data) > 0) else payload

    return OrgApprovalRecord(
        id=str(data.get("id") or ""),
        org_id=org_id,
        request_type=APPROVAL_TYPE_ROLE_CHANGE,
        status=APPROVAL_STATUS_PENDING,
        requested_by=requested_by,
        target_user_id=target_user_id,
        target_email=target_email,
        target_name=target_name,
        from_role=ROLE_MEMBER,
        to_role=ROLE_FOUNDER,
        created_at=data.get("created_at") or now_iso,
    )


async def _enrich_approvals_with_names(
    supabase: Any,
    org_id: str,
    rows: List[Dict[str, Any]],
) -> List[OrgApprovalRecord]:
    """Helper to attach user profile names to approval records."""
    if not rows:
        return []

    target_ids = list({str(r["target_user_id"]) for r in rows if r.get("target_user_id")})
    name_map: Dict[str, str] = {}
    if target_ids:
        try:
            p_res = await (
                supabase.table(USER_PROFILES_TABLE)
                .select("user_id, full_name, email")
                .eq("org_id", org_id)
                .in_("user_id", target_ids)
                .execute()
            )
            for p in p_res.data or []:
                name_map[str(p["user_id"])] = p.get("full_name") or ""
        except Exception:
            pass

    return [
        OrgApprovalRecord(
            id=str(r["id"]),
            org_id=str(r["org_id"]),
            request_type=r.get("request_type", APPROVAL_TYPE_ROLE_CHANGE),
            status=r.get("status", APPROVAL_STATUS_PENDING),
            requested_by=str(r.get("requested_by") or ""),
            target_user_id=str(r.get("target_user_id") or ""),
            target_email=r.get("target_email"),
            target_name=name_map.get(str(r.get("target_user_id"))) or r.get("target_email"),
            from_role=r.get("from_role", ROLE_MEMBER),
            to_role=r.get("to_role", ROLE_FOUNDER),
            decided_by=str(r["decided_by"]) if r.get("decided_by") else None,
            decided_at=r.get("decided_at"),
            decision_note=r.get("decision_note"),
            created_at=r.get("created_at"),
        )
        for r in rows
    ]


async def fetch_pending_org_approvals(supabase: Any, org_id: str) -> List[OrgApprovalRecord]:
    """Fetch all pending approval requests for an organization (for the org owner)."""
    try:
        res = await (
            supabase.table(ORG_APPROVALS_TABLE)
            .select("*")
            .eq("org_id", org_id)
            .eq("status", APPROVAL_STATUS_PENDING)
            .order("created_at", desc=True)
            .execute()
        )
        return await _enrich_approvals_with_names(supabase, org_id, res.data or [])
    except Exception:
        return []


async def fetch_my_requested_approvals(
    supabase: Any,
    org_id: str,
    user_id: str,
) -> List[OrgApprovalRecord]:
    """Fetch recent approval requests submitted by this founder (for My Requests view)."""
    try:
        res = await (
            supabase.table(ORG_APPROVALS_TABLE)
            .select("*")
            .eq("org_id", org_id)
            .eq("requested_by", user_id)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        return await _enrich_approvals_with_names(supabase, org_id, res.data or [])
    except Exception:
        return []


async def fetch_approval_by_id(
    supabase: Any,
    approval_id: str,
    org_id: str,
) -> Optional[Dict[str, Any]]:
    """Fetch single approval record by ID."""
    try:
        res = await (
            supabase.table(ORG_APPROVALS_TABLE)
            .select("*")
            .eq("id", approval_id)
            .eq("org_id", org_id)
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass
    return None


async def lock_and_decide_approval(
    supabase: Any,
    approval_id: str,
    org_id: str,
    new_status: str,
    decided_by: str,
    note: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Update approval status atomically only if currently pending."""
    now_iso = utc_now_iso()
    payload: Dict[str, Any] = {
        "status": new_status,
        "decided_by": decided_by,
        "decided_at": now_iso,
    }
    if note:
        payload["decision_note"] = note.strip()

    try:
        res = await (
            supabase.table(ORG_APPROVALS_TABLE)
            .update(payload)
            .eq("id", approval_id)
            .eq("org_id", org_id)
            .eq("status", APPROVAL_STATUS_PENDING)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as exc:
        print(f"Warning: Failed to decide approval in DB: {exc}")
    return None


__all__ = [
    "fetch_approval_by_id",
    "fetch_my_requested_approvals",
    "fetch_pending_org_approvals",
    "insert_role_change_approval",
    "lock_and_decide_approval",
]
