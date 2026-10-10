import os
from typing import Dict, Any
from supabase import create_client

from app.langgraph.email_writer.state.state import EmailGraphState

async def store_email_node(state: EmailGraphState) -> Dict[str, Any]:
    """Node that stores the generated email to Supabase."""
    user_context = state.get("user_context")
    target_company = state.get("target_company")
    generated_email = state.get("generated_email")
    
    if not generated_email or not user_context or not target_company:
        return {}
        
    try:
        supabase_url = os.environ.get("SUPABASE_URL", "")
        supabase_key = os.environ.get("SUPABASE_KEY", "")
        
        if supabase_url and supabase_key:
            supabase = create_client(supabase_url, supabase_key)
            table_name = os.environ.get("SUPABASE_EMAIL_TABLE_NAME", "user_emails")
            
            user_id = getattr(user_context, "user_id", None) if not isinstance(user_context, dict) else user_context.get("user_id")
            company_name = getattr(target_company, "name", None) if not isinstance(target_company, dict) else target_company.get("name")
            
            if user_id:
                record = {
                    "user_id": user_id,
                    "company_name": company_name,
                    "subject": generated_email.subject,
                    "body": generated_email.body
                }
                supabase.table(table_name).insert(record).execute()
    except Exception as e:
        return {"errors": state.get("errors", []) + [f"Failed to store email to Supabase: {str(e)}"]}

    return {}
