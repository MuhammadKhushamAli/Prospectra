"""LangGraph node and modular helper functions for loading user profile, skills, and target industries."""

import os
from typing import Any, Dict, List, Optional, Tuple

from app.core.logging_config import get_node_logger
from app.models.skills import Skill
from app.models.user_context import UserContext
from app.services.supabase import get_supabase_client
from ..company_finder.state.state import GraphState

logger = get_node_logger("load_user_context")

USER_PROFILES_TABLE = os.environ.get("SUPABASE_USER_PROFILES_TABLE_NAME", "user_profiles")
USER_SKILLS_TABLE = os.environ.get("SUPABASE_USER_SKILLS_TABLE_NAME", "user_skills")
SKILLS_TABLE = os.environ.get("SUPABASE_SKILLS_TABLE_NAME", "skills")
TARGET_INDUSTRIES_TABLE = os.environ.get("SUPABASE_TARGET_INDUSTRIES_TABLE_NAME", "target_industries")
USER_TARGET_INDUSTRIES_TABLE = os.environ.get("SUPABASE_USER_TARGET_INDUSTRIES_TABLE_NAME", "user_target_industries")
ORGANIZATIONS_TABLE = os.environ.get("SUPABASE_ORGANIZATIONS_TABLE_NAME", "organizations")
DOMAIN_VERIFICATIONS_TABLE = os.environ.get("SUPABASE_DOMAIN_VERIFICATIONS_TABLE_NAME", "domain_verifications")


def validate_state_ids(state: Dict[str, Any]) -> Tuple[str, str]:
    """Extract and validate user_id and org_id from graph state."""
    user_context = state.get("user_context")
    if user_context:
        user_id = getattr(user_context, "user_id", None) or (user_context.get("user_id") if isinstance(user_context, dict) else None)
        org_id = getattr(user_context, "org_id", None) or (user_context.get("org_id") if isinstance(user_context, dict) else None)
    else:
        user_id = state.get("user_id")
        org_id = state.get("org_id")

    if not user_id or not org_id:
        raise ValueError("user_id and org_id are required to load user context.")

    return str(user_id), str(org_id)


async def fetch_user_profile(
    supabase: Any,
    user_id: str,
    org_id: str,
) -> Dict[str, Any]:
    """Fetch user full_name and email from user_profiles table."""
    try:
        response = await (
            supabase.table(USER_PROFILES_TABLE)
            .select("full_name, headline, email, github_url, linkedin_url")
            .eq("user_id", user_id)
            .eq("org_id", org_id)
            .single()
            .execute()
        )
        return response.data or {}
    except Exception as e:
        logger.warning(f"Warning: Failed to fetch profile for user {user_id}: {str(e)}")
        return {}


async def fetch_user_skills(
    supabase: Any,
    user_id: str,
    org_id: str,
) -> List[Skill]:
    """Fetch user's linked skills from user_skills and skills tables."""
    try:
        user_skills_response = await (
            supabase.table(USER_SKILLS_TABLE)
            .select("skill_id")
            .eq("user_id", user_id)
            .execute()
        )
        skill_ids = [
            record["skill_id"]
            for record in (user_skills_response.data or [])
            if record.get("skill_id")
        ]

        if not skill_ids:
            return []

        skills_response = await (
            supabase.table(SKILLS_TABLE)
            .select("*")
            .in_("id", skill_ids)
            .eq("org_id", org_id)
            .execute()
        )
        return [Skill(**skill) for skill in (skills_response.data or [])]
    except Exception as e:
        logger.warning(f"Warning: Failed to fetch skills for user {user_id}: {str(e)}")
        return []


async def fetch_user_target_industries(
    supabase: Any,
    user_id: str,
    org_id: str,
    state_target_industries: Optional[List[str]] = None,
) -> List[str]:
    """Resolve target industries from state, junction table, or organization level."""
    # 1. Use target_industries directly from state if already present
    if state_target_industries and isinstance(state_target_industries, list):
        cleaned = [str(x).strip() for x in state_target_industries if str(x).strip()]
        if cleaned:
            return cleaned

    target_industries: List[str] = []

    try:
        # 2. Query user_target_industries junction table
        user_target_res = await (
            supabase.table(USER_TARGET_INDUSTRIES_TABLE)
            .select("target_industry_id")
            .eq("user_id", user_id)
            .execute()
        )
        target_ids = [
            r["target_industry_id"]
            for r in (user_target_res.data or [])
            if r.get("target_industry_id")
        ]

        if target_ids:
            target_industries_response = await (
                supabase.table(TARGET_INDUSTRIES_TABLE)
                .select("*")
                .in_("id", target_ids)
                .eq("org_id", org_id)
                .execute()
            )
            for row in (target_industries_response.data or []):
                val = row.get("name") or row.get("target_industries")
                if isinstance(val, list):
                    target_industries.extend([str(item).strip() for item in val if str(item).strip()])
                elif isinstance(val, str) and val.strip():
                    target_industries.append(val.strip())

        # 3. Fallback to organization level target_industries
        if not target_industries:
            org_target_res = await (
                supabase.table(TARGET_INDUSTRIES_TABLE)
                .select("*")
                .eq("org_id", org_id)
                .execute()
            )
            for row in (org_target_res.data or []):
                val = row.get("name") or row.get("target_industries")
                if isinstance(val, list):
                    target_industries.extend([str(item).strip() for item in val if str(item).strip()])
                elif isinstance(val, str) and val.strip():
                    target_industries.append(val.strip())

    except Exception as e:
        logger.warning(f"Warning: Failed to load target industries for user {user_id}: {str(e)}")

    return target_industries


async def fetch_organization_info(
    supabase: Any,
    org_id: str,
    override_domain: Optional[str] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """Fetch organization name and primary verified domain."""
    org_name: Optional[str] = None
    org_domain: Optional[str] = override_domain

    try:
        org_response = await (
            supabase.table(ORGANIZATIONS_TABLE)
            .select("name")
            .eq("id", org_id)
            .single()
            .execute()
        )
        if org_response.data and org_response.data.get("name"):
            org_name = org_response.data["name"]
    except Exception as e:
        logger.warning(f"Warning: Failed to fetch organization name for {org_id}: {str(e)}")

    if not org_domain:
        try:
            domain_response = await (
                supabase.table(DOMAIN_VERIFICATIONS_TABLE)
                .select("domain")
                .eq("org_id", org_id)
                .limit(1)
                .execute()
            )
            data = domain_response.data or []
            if data and data[0].get("domain"):
                org_domain = data[0]["domain"]
        except Exception as e:
            logger.warning(f"Warning: Failed to fetch organization domain for {org_id}: {str(e)}")

    return org_name, org_domain


def build_user_context(
    user_id: str,
    org_id: str,
    profile: Dict[str, Any],
    skills: List[Skill],
    target_industries: List[str],
    org_name: Optional[str] = None,
    org_domain: Optional[str] = None,
) -> UserContext:
    """Instantiate and return the UserContext dataclass."""
    return UserContext(
        user_id=user_id,
        org_id=org_id,
        full_name=profile.get("full_name", ""),
        email=profile.get("email", ""),
        headline=profile.get("headline"),
        org_name=org_name,
        org_domain=org_domain,
        github_url=profile.get("github_url"),
        linkedin_url=profile.get("linkedin_url"),
        skills=skills,
        target_industries=target_industries if target_industries else None,
    )


async def load_user_context_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Load the user's profile, skills, target industries, and org info into a UserContext in graph state."""
    user_id, org_id = validate_state_ids(state)
    logger.banner(f"[PHASE 0: LOAD USER CONTEXT] User: {user_id} | Org: {org_id}")
    supabase = await get_supabase_client()

    profile = await fetch_user_profile(supabase, user_id, org_id)
    skills = await fetch_user_skills(supabase, user_id, org_id)

    user_context_in = state.get("user_context")
    state_target_industries = None
    if user_context_in:
        state_target_industries = getattr(user_context_in, "target_industries", None) or (user_context_in.get("target_industries") if isinstance(user_context_in, dict) else None)
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

    logger.info(f"Loaded context for '{user_context.full_name}' | Skills: {len(skills)} | Target industries: {len(target_industries)}")

    return {
        "user_context": user_context,
    }
