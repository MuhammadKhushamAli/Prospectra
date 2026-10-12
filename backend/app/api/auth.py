"""Supabase token authentication and organization membership checks."""

from fastapi import HTTPException, status

from app.services.supabase import get_supabase_client


async def authorize_org_member(token: str, org_id: str) -> str:
    """Resolve the user from a Supabase token and ensure they belong to the org.

    Returns the user id. Raises 401 for an invalid token, 403 for non-members.
    """
    supabase = await get_supabase_client()
    try:
        user_response = await supabase.auth.get_user(token)
        user_id = user_response.user.id
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    membership = await supabase.rpc(
        "is_user_part_of_organization",
        {"p_user_id": user_id, "p_org_id": org_id},
    ).execute()
    if not membership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this organization",
        )
    return user_id
