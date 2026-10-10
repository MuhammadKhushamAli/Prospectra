"""Tool to get a company from Supabase by ID."""

import os
from typing import Dict, Any
from supabase import create_client

from app.langgraph.email_writer.state.state import EmailGraphState
from app.models.company import Company, CompanyEmail

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
        
        # Convert raw emails back to CompanyEmail dataclass if they exist
        raw_emails = data.get("emails", [])
        company_emails = []
        for e in raw_emails:
            if isinstance(e, dict):
                company_emails.append(CompanyEmail(**e))
            
        company = Company(
            name=data.get("name", ""),
            web=data.get("web"),
            emails=company_emails,
            target_industry=data.get("target_industry"),
            target_skills=data.get("target_skills", []),
            description=data.get("description"),
            location=data.get("location"),
            employee_count=data.get("employee_count"),
            linkedin_url=data.get("linkedin_url"),
        )
        
        return {"target_company": company}
    except Exception as e:
        return {"errors": state.get("errors", []) + [f"Failed to fetch company from DB: {str(e)}"]}
