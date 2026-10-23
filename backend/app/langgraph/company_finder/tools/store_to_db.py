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
        supabase = await get_supabase_client()
        
        records = []
        for company in accepted_companies:
            rec = asdict(company)
            # Ensure status is pending_review for newly discovered leads awaiting human review
            if rec.get("status") in ("active", "discovered", "", None):
                rec["status"] = "pending_review"
            # Supabase companies table uses text[] for source column
            if isinstance(rec.get("source"), str):
                rec["source"] = [rec["source"]] if rec["source"] else ["apollo"]
            records.append(rec)

        if records:
            table_name = os.environ.get("SUPABASE_COMPANIES_TABLE_NAME", "companies")
            await supabase.table(table_name).upsert(records).execute()
            
    except Exception as e:
        errors = state.get("errors", [])
        error_msg = f"Failed to store to Supabase: {str(e)}"
        if error_msg not in errors:
            errors.append(error_msg)
        return {"errors": errors}

    return {}
