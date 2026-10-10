"""LangGraph node for storing data to Supabase."""

import os
from typing import Any, Dict
from supabase import create_client, Client

from ..state.state import GraphState


def get_supabase_client() -> Client:
    """Initialize and return Supabase client."""
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")
    return create_client(url, key)


async def store_to_db_node(state: GraphState) -> Dict[str, Any]:
    """Node that stores accepted companies to the database and associates them with user id."""
    user_context = state.get("user_context")
    accepted_companies = state.get("accepted_companies", [])
    
    if not user_context:
        errors = state.get("errors", [])
        if "No user_context found" not in errors:
            errors.append("No user_context found")
        return {"errors": errors}

    user_id = getattr(user_context, "user_id", None) if not isinstance(user_context, dict) else user_context.get("user_id")
    org_id = getattr(user_context, "org_id", None) if not isinstance(user_context, dict) else user_context.get("org_id")

    if not user_id or not org_id:
        errors = state.get ("errors", [])
        if "No user_id or org_id found in context" not in errors:
            errors.append("No user_id or org_id found in context")
        return {"errors": errors}

    
    if not accepted_companies:
        return {}
    
    try:
        supabase = get_supabase_client()
                
        records = []
        for company in accepted_companies:
            company_data = {
                "org_id": org_id,
                "name": getattr(company, "name", None),
                "domain": getattr(company, "domain", None),
                "website": getattr(company, "website", None),
                "linkedin_url": getattr(company, "linkedin_url", None),
                "industry": getattr(company, "industry", None),
                "size": getattr(company, "size", None),
                "source": getattr(company, "source", None),
                "raw_signals": getattr(company, "raw_signals", None),
                "status": getattr(company, "status", "active"),
            }
            records.append(company_data)
            
        if records:
            table_name = os.environ.get("SUPABASE_COMPANY_TABLE_NAME", "user_companies")
            supabase.table(table_name).upsert(records).execute()
            
    except Exception as e:
        errors = state.get("errors", [])
        error_msg = f"Failed to store to Supabase: {str(e)}"
        if error_msg not in errors:
            errors.append(error_msg)
        return {"errors": errors}

    return {}
