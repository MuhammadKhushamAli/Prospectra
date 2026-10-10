"""LangGraph node for storing data to Supabase."""

import os
from dataclasses import asdict
from typing import Any, Dict

from app.services.supabase import get_supabase_client
from ..state.state import GraphState


async def store_to_db_node(state: GraphState) -> Dict[str, Any]:
    """Node that stores accepted companies to the database."""
    accepted_companies = state.get("accepted_companies", [])
    
    if not accepted_companies:
        return {}
    
    try:
        supabase = get_supabase_client()
        
        records = [asdict(company) for company in accepted_companies]
            
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
