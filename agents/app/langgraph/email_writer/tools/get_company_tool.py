"""Tool to get a company from Supabase by ID."""

import os
from typing import Dict, Any
from supabase import create_client

from app.langgraph.email_writer.state.state import EmailGraphState
from app.models.company import Company

async def get_company_node(state: EmailGraphState) -> Dict[str, Any]:
    """Node that fetches a company from Supabase using target_company_id."""
    target_company_id = state.get("target_company_id")
    
    if not target_company_id:
        return {"errors": state.get("errors", []) + ["Missing target_company_id"]}
        
    try:
        supabase_url = os.environ.get("SUPABASE_URL", "")
        supabase_key = os.environ.get("SUPABASE_KEY", "")
        
        if not supabase_url or not supabase_key:
            return {"errors": state.get("errors", []) + ["Missing Supabase credentials"]}
            
        supabase = create_client(supabase_url, supabase_key)
        table_name = os.environ.get("SUPABASE_COMPANY_TABLE_NAME", "user_companies")
        
        response = supabase.table(table_name).select("*").eq("id", target_company_id).single().execute()
        
        if not response.data:
            return {"errors": state.get("errors", []) + [f"Company with ID {target_company_id} not found"]}
            
        data = response.data
        
        company = Company(
            id=data.get("id"),
            org_id=data.get("org_id"),
            name=data.get("name"),
            domain=data.get("domain"),
            website=data.get("website"),
            linkedin_url=data.get("linkedin_url"),
            industry=data.get("industry"),
            size=data.get("size"),
            source=data.get("source"),
            raw_signals=data.get("raw_signals"),
            status=data.get("status", "active"),
        )
        
        return {"target_company": company}
    except Exception as e:
        return {"errors": state.get("errors", []) + [f"Failed to fetch company from DB: {str(e)}"]}
