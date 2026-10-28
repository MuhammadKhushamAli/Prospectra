"""Tool to get a company from Supabase by ID."""

import os
from typing import Dict, Any

from app.langgraph.email_writer.state.state import EmailGraphState
from app.models.company import Company
from app.services.supabase import get_supabase_client

async def get_company_node(state: EmailGraphState) -> Dict[str, Any]:
    """Node that fetches a company from Supabase using target_company_id."""
    target_company_id = state.get("target_company_id")
    
    if not target_company_id:
        return {"errors": state.get("errors", []) + ["Missing target_company_id"]}
        
    try:
        supabase = await get_supabase_client()
        table_name = os.environ.get("SUPABASE_COMPANIES_TABLE_NAME", "companies")
        
        response = await supabase.table(table_name).select("*").eq("id", target_company_id).single().execute()
        
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
            about_text=data.get("about_text"),
            need_hypothesis=data.get("need_hypothesis"),
            needed_skills=data.get("needed_skills") or [],
            needed_services=data.get("needed_services") or [],
            need_signals=data.get("need_signals") or [],
            proposed_solution=data.get("proposed_solution"),
            services_offered=data.get("services_offered") or [],
            digital_features=data.get("digital_features") or [],
            auth_score=data.get("auth_score"),
            auth_feedback=data.get("auth_feedback"),
            source=data.get("source"),
            raw_signals=data.get("raw_signals"),
            status=data.get("status", "active"),
        )
        
        return {"target_company": company}
    except Exception as e:
        return {"errors": state.get("errors", []) + [f"Failed to fetch company from DB: {str(e)}"]}
