"""Module to generate and store emails to Supabase."""

import os
from supabase import create_client

from app.models.company import Company
from app.models.user_context import UserContext
from .email_agent import write_email
from .pydantic_model.email_model import EmailContent


async def generate_and_store_email(
    user_context: UserContext,
    target_company: Company,
) -> EmailContent:
    """Generate an email using the email agent and store it in Supabase.
    
    Parameters
    ----------
    user_context:
        The context and skills of the user sending the email.
    target_company:
        The target company the user is reaching out to.
        
    Returns
    -------
    EmailContent
        Generated subject and body for the email.
    """
    response = await write_email(user_context=user_context, target_company=target_company)
    
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
                    "subject": response.subject,
                    "body": response.body
                }
                supabase.table(table_name).insert(record).execute()
    except Exception as e:
        print(f"Failed to store email to Supabase: {str(e)}")

    return response
