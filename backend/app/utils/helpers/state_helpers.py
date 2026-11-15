"""Shared LangGraph state extraction and UserContext resolution helpers."""

from typing import Any, Dict, List, Optional, Tuple


def resolve_user_id(user_context: Any) -> Optional[str]:
    """Extract user_id safely from a UserContext object or dict."""
    if not user_context:
        return None
    if isinstance(user_context, dict):
        return user_context.get("user_id")
    return getattr(user_context, "user_id", None)


def resolve_org_id(user_context: Any, target_company: Any = None) -> Optional[str]:
    """Extract active org_id safely from user_context or target_company."""
    if user_context:
        org_id = (
            user_context.get("org_id")
            if isinstance(user_context, dict)
            else getattr(user_context, "org_id", None)
        )
        if org_id:
            return org_id
    if target_company:
        return (
            target_company.get("org_id")
            if isinstance(target_company, dict)
            else getattr(target_company, "org_id", None)
        )
    return None


def resolve_company_id(target_company: Any) -> Optional[str]:
    """Extract company_id safely from a Company object or dict."""
    if not target_company:
        return None
    if isinstance(target_company, dict):
        return target_company.get("id")
    return getattr(target_company, "id", None)


def resolve_state_company_id(state: Dict[str, Any]) -> Optional[str]:
    """Resolve target company ID from state or target_company object."""
    company_id = state.get("target_company_id")
    if company_id:
        return str(company_id)
    comp_id = resolve_company_id(state.get("target_company"))
    return str(comp_id) if comp_id else None


def extract_org_and_user_from_state(state: Any) -> Tuple[str, str]:
    """Extract (org_id, user_id) strings from a graph state dict or object."""
    if isinstance(state, dict):
        user_context = state.get("user_context")
        fallback_org = state.get("org_id", "")
        fallback_user = state.get("user_id", "")
    else:
        user_context = getattr(state, "user_context", None)
        fallback_org = getattr(state, "org_id", "")
        fallback_user = getattr(state, "user_id", "")

    org_id = resolve_org_id(user_context) or fallback_org or ""
    user_id = resolve_user_id(user_context) or fallback_user or ""
    return str(org_id), str(user_id)


def validate_state_ids(state: Dict[str, Any]) -> Tuple[str, str]:
    """Extract and validate required (user_id, org_id) from graph state."""
    org_id, user_id = extract_org_and_user_from_state(state)
    if not user_id or not org_id:
        raise ValueError("user_id and org_id are required to load user context.")
    return str(user_id), str(org_id)


def extract_skill_names(user_context: Any) -> List[str]:
    """Extract clean skill names list from a UserContext instance."""
    skills = getattr(user_context, "skills", None) if user_context else None
    if not skills:
        return []
    names: List[str] = []
    for s in skills:
        if isinstance(s, str):
            names.append(s)
        elif hasattr(s, "name"):
            names.append(s.name)
        else:
            names.append(str(s))
    return names


def extract_target_industries_list(user_context: Any, fallback: Optional[List[str]] = None) -> List[str]:
    """Extract clean target industry strings from UserContext or fallback list."""
    raw = (
        getattr(user_context, "target_industries", None)
        if user_context
        else None
    ) or fallback or []
    return [str(item).strip() for item in raw if str(item).strip()]
