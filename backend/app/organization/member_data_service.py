"""Domain service for read-only inspection of teammate companies and outreach emails."""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import HTTPException

from app.organization.helpers.members_db_helpers import fetch_member_by_user_id, fetch_org_owner_id
from app.organization.models import ActorContext
from app.organization.policies import can_view_teammate_data
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import COMPANIES_TABLE, CONTACTS_TABLE, EMAILS_TABLE


async def list_member_companies(
    actor: ActorContext,
    target_user_id: str,
) -> List[Dict[str, Any]]:
    """Retrieve companies searched and discovered by a specific team member."""
    supabase = await get_supabase_client()
    target_member = await fetch_member_by_user_id(supabase, actor.org_id, target_user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Target user not found in this organization.")

    owner_id = await fetch_org_owner_id(supabase, actor.org_id)
    target_is_owner = (owner_id is not None) and (target_user_id == owner_id)
    target_role = target_member.get("role", "member")

    allowed, err = can_view_teammate_data(actor, target_is_owner, target_role)
    if not allowed:
        raise HTTPException(status_code=403, detail=err)

    try:
        res = await (
            supabase.table(COMPANIES_TABLE)
            .select("*")
            .eq("org_id", actor.org_id)
            .eq("discovered_by_user_id", target_user_id)
            .order("created_at", desc=True)
            .execute()
        )
        companies = res.data or []

        # Attach contacts for each company
        company_ids = [c["id"] for c in companies if c.get("id")]
        if company_ids:
            try:
                c_res = await (
                    supabase.table(CONTACTS_TABLE)
                    .select("*")
                    .in_("company_id", company_ids)
                    .execute()
                )
                contacts_map: Dict[str, List[Dict[str, Any]]] = {}
                for contact in c_res.data or []:
                    cid = contact.get("company_id")
                    if cid not in contacts_map:
                        contacts_map[cid] = []
                    contacts_map[cid].append(contact)

                for comp in companies:
                    comp["contacts"] = contacts_map.get(comp["id"], [])
            except Exception:
                pass

        return companies
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to query member companies: {exc}")


async def list_member_emails(
    actor: ActorContext,
    target_user_id: str,
) -> List[Dict[str, Any]]:
    """Retrieve outreach emails sent or drafted by a specific team member."""
    supabase = await get_supabase_client()
    target_member = await fetch_member_by_user_id(supabase, actor.org_id, target_user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Target user not found in this organization.")

    owner_id = await fetch_org_owner_id(supabase, actor.org_id)
    target_is_owner = (owner_id is not None) and (target_user_id == owner_id)
    target_role = target_member.get("role", "member")

    allowed, err = can_view_teammate_data(actor, target_is_owner, target_role)
    if not allowed:
        raise HTTPException(status_code=403, detail=err)

    try:
        res = await (
            supabase.table(EMAILS_TABLE)
            .select("*, companies(name, domain)")
            .eq("sent_by_org_id", actor.org_id)
            .eq("sent_by_user_id", target_user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to query member emails: {exc}")


__all__ = ["list_member_companies", "list_member_emails"]
