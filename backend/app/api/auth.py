"""Supabase token authentication and organization membership checks."""

from app.api.helpers.auth_helpers import extract_user_from_token, verify_org_membership
from app.services.supabase import get_supabase_client


async def authorize_org_member_with_email(token: str, org_id: str) -> tuple[str, str | None]:
    """Resolve the user and their email from a Supabase token and ensure they belong to the org."""
    supabase = await get_supabase_client()
    user_id, user_email = await extract_user_from_token(supabase, token)
    await verify_org_membership(supabase, user_id, org_id)
    return user_id, user_email


async def authorize_org_member(token: str, org_id: str) -> str:
    """Resolve the user from a Supabase token and ensure they belong to the org."""
    user_id, _ = await authorize_org_member_with_email(token, org_id)
    return user_id
