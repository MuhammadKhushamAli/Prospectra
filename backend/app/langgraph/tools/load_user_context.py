"""LangGraph node for loading user profile, skills, and target industries."""

from typing import Any, Dict

from app.core.logging_config import get_node_logger
from app.langgraph.tools.helpers.user_context_helpers import (
    build_user_context,
    fetch_organization_info,
    fetch_user_profile,
    fetch_user_skills,
    fetch_user_target_industries,
)
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import (
    DOMAIN_VERIFICATIONS_TABLE,
    ORGANIZATIONS_TABLE,
    SKILLS_TABLE,
    TARGET_INDUSTRIES_TABLE,
    USER_PROFILES_TABLE,
    USER_SKILLS_TABLE,
    USER_TARGET_INDUSTRIES_TABLE,
)
from app.utils.helpers.state_helpers import validate_state_ids

logger = get_node_logger("load_user_context")


async def load_user_context_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Load the user's profile, skills, target industries, and org info into a UserContext in graph state."""
    user_id, org_id = validate_state_ids(state)
    supabase = await get_supabase_client()

    profile = await fetch_user_profile(supabase, user_id, org_id)
    skills = await fetch_user_skills(supabase, user_id, org_id)

    user_context_in = state.get("user_context")
    state_target_industries = None
    if user_context_in:
        state_target_industries = getattr(user_context_in, "target_industries", None) or (
            user_context_in.get("target_industries") if isinstance(user_context_in, dict) else None
        )
    if not state_target_industries:
        state_target_industries = state.get("target_industries")

    target_industries = await fetch_user_target_industries(
        supabase=supabase,
        user_id=user_id,
        org_id=org_id,
        state_target_industries=state_target_industries,
    )

    override_domain = (
        getattr(user_context_in, "org_domain", None)
        if user_context_in
        else state.get("org_domain")
    )
    org_name, org_domain = await fetch_organization_info(
        supabase=supabase,
        org_id=org_id,
        override_domain=override_domain,
    )

    user_context = build_user_context(
        user_id=user_id,
        org_id=org_id,
        profile=profile,
        skills=skills,
        target_industries=target_industries,
        org_name=org_name,
        org_domain=org_domain,
    )

    logger.info(
        f"[LOAD USER CONTEXT] Loaded {len(skills)} skill(s) and {len(target_industries)} target industry(ies)."
    )

    return {
        "user_context": user_context,
    }


__all__ = [
    "USER_PROFILES_TABLE",
    "USER_SKILLS_TABLE",
    "SKILLS_TABLE",
    "TARGET_INDUSTRIES_TABLE",
    "USER_TARGET_INDUSTRIES_TABLE",
    "ORGANIZATIONS_TABLE",
    "DOMAIN_VERIFICATIONS_TABLE",
    "validate_state_ids",
    "fetch_user_profile",
    "fetch_user_skills",
    "fetch_user_target_industries",
    "fetch_organization_info",
    "build_user_context",
    "load_user_context_node",
]
