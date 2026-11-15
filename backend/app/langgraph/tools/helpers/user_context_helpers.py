"""Helper functions for fetching user profile, skills, target industries, and organization info from Supabase."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from app.core.logging_config import get_node_logger
from app.models.skills import Skill
from app.models.user_context import UserContext
from app.utils.constants.db_tables import (
    DOMAIN_VERIFICATIONS_TABLE,
    ORGANIZATIONS_TABLE,
    SKILLS_TABLE,
    TARGET_INDUSTRIES_TABLE,
    USER_PROFILES_TABLE,
    USER_SKILLS_TABLE,
    USER_TARGET_INDUSTRIES_TABLE,
)

logger = get_node_logger("load_user_context")


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
    except Exception as exc:
        logger.warning(f"Warning: Failed to fetch profile for user {user_id}: {str(exc)}")
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
    except Exception as exc:
        logger.warning(f"Warning: Failed to fetch skills for user {user_id}: {str(exc)}")
        return []


def _extract_industry_names_from_rows(rows: List[Dict[str, Any]]) -> List[str]:
    """Extract clean industry names from target_industries table rows."""
    names: List[str] = []
    for row in rows:
        val = row.get("name") or row.get("target_industries")
        if isinstance(val, list):
            names.extend([str(item).strip() for item in val if str(item).strip()])
        elif isinstance(val, str) and val.strip():
            names.append(val.strip())
    return names


async def fetch_user_target_industries(
    supabase: Any,
    user_id: str,
    org_id: str,
    state_target_industries: Optional[List[str]] = None,
) -> List[str]:
    """Resolve target industries from state, junction table, or organization level."""
    if state_target_industries and isinstance(state_target_industries, list):
        cleaned = [str(x).strip() for x in state_target_industries if str(x).strip()]
        if cleaned:
            return cleaned

    target_industries: List[str] = []

    try:
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
            target_industries.extend(_extract_industry_names_from_rows(target_industries_response.data or []))

        if not target_industries:
            org_target_res = await (
                supabase.table(TARGET_INDUSTRIES_TABLE)
                .select("*")
                .eq("org_id", org_id)
                .execute()
            )
            target_industries.extend(_extract_industry_names_from_rows(org_target_res.data or []))

    except Exception as exc:
        logger.warning(f"Warning: Failed to load target industries for user {user_id}: {str(exc)}")

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
    except Exception as exc:
        logger.warning(f"Warning: Failed to fetch organization name for {org_id}: {str(exc)}")

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
        except Exception as exc:
            logger.warning(f"Warning: Failed to fetch organization domain for {org_id}: {str(exc)}")

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
