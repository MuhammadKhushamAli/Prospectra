"""LangGraph node for loading a user's profile and skills."""

from typing import Any, Dict

from app.models.skills import Skill
from app.models.user_context import UserContext
from app.services.supabase import get_supabase_client
from ..company_finder.state.state import GraphState

async def load_user_context_node(state: GraphState) -> Dict[str, Any]:
    """Load the user's profile and skills into a UserContext in graph state."""
    user_id = state.get("user_id")
    org_id = state.get("org_id")

    if not user_id or not org_id:
        raise ValueError("user_id and org_id are required to load user context.")

    supabase = get_supabase_client()

    profile_response = (
        supabase.table("user_profiles")
        .select("full_name, email")
        .eq("user_id", user_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    profile = profile_response.data

    user_skills_response = (
        supabase.table("user_skills")
        .select("skill_id")
        .eq("user_id", user_id)
        .execute()
    )
    skill_ids = [record["skill_id"] for record in user_skills_response.data]

    skills = []
    if skill_ids:
        skills_response = (
            supabase.table("skills")
            .select("*")
            .in_("id", skill_ids)
            .eq("org_id", org_id)
            .execute()
        )
        skills = [Skill(**skill) for skill in skills_response.data]

    user_context = UserContext(
        user_id=user_id,
        org_id=org_id,
        full_name=profile.get("full_name", ""),
        email=profile.get("email", ""),
        skills=skills,
    )

    return {"user_context": user_context}
