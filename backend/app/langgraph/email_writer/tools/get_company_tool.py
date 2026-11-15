"""Tool to get a company from Supabase by ID along with its targeted signals and contacts."""

from typing import Any, Dict

from app.langgraph.email_writer.state.state import EmailGraphState
from app.langgraph.email_writer.tools.helpers.get_company_helpers import (
    build_target_company,
    fetch_company_contacts,
    fetch_company_record,
    map_contacts_to_company_emails,
)
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import COMPANIES_TABLE, CONTACTS_TABLE


async def get_company_node(state: EmailGraphState) -> Dict[str, Any]:
    """Node that fetches a company from Supabase using target_company_id with full target details."""
    target_company_id = state.get("target_company_id")
    if not target_company_id:
        return {"errors": state.get("errors", []) + ["Missing target_company_id"]}

    try:
        supabase = await get_supabase_client()
        company_data = await fetch_company_record(supabase, COMPANIES_TABLE, target_company_id)
        if not company_data:
            return {"errors": state.get("errors", []) + [f"Company with ID {target_company_id} not found"]}

        contacts_data = await fetch_company_contacts(supabase, CONTACTS_TABLE, target_company_id)
        company = build_target_company(company_data, contacts_data)
        primary_contact_id = contacts_data[0].get("id") if contacts_data else None

        return {
            "target_company": company,
            "contact_id": primary_contact_id,
        }
    except Exception as exc:
        return {"errors": state.get("errors", []) + [f"Failed to fetch company details from DB: {str(exc)}"]}


__all__ = [
    "fetch_company_record",
    "fetch_company_contacts",
    "map_contacts_to_company_emails",
    "build_target_company",
    "get_company_node",
]
