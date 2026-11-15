"""Helper functions for Supabase token resolution and organization membership checks."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status


async def extract_user_from_token(supabase: Any, token: str) -> tuple[str, str | None]:
    """Resolve user_id and user_email from a Supabase JWT access token."""
    try:
        user_response = await supabase.auth.get_user(token)
        user_id = user_response.user.id
        user_email = getattr(user_response.user, "email", None)
        return user_id, user_email
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


async def verify_org_membership(supabase: Any, user_id: str, org_id: str) -> None:
    """Ensure the authenticated user belongs to the specified organization."""
    membership = await supabase.rpc(
        "is_user_part_of_organization",
        {"p_user_id": user_id, "p_org_id": org_id},
    ).execute()
    if not membership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this organization",
        )
