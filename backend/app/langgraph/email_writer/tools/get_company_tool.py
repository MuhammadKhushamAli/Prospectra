"""Tool to get a company from Supabase by ID along with its targeted signals and contacts."""

import os
from typing import Dict, Any, List, Optional

from app.langgraph.email_writer.state.state import EmailGraphState
from app.models.company import Company, CompanyEmail
from app.services.supabase import get_supabase_client


async def fetch_company_record(
    supabase: Any,
    table_name: str,
    target_company_id: str,
) -> Optional[Dict[str, Any]]:
    """Fetch the company row from Supabase companies table."""
    response = await (
        supabase.table(table_name)
        .select("*")
        .eq("id", target_company_id)
        .single()
        .execute()
    )
    return response.data if response and response.data else None


async def fetch_company_contacts(
    supabase: Any,
    contacts_table: str,
    target_company_id: str,
) -> List[Dict[str, Any]]:
    """Fetch associated contacts for the company."""
    try:
        response = await (
            supabase.table(contacts_table)
            .select("*")
            .eq("company_id", target_company_id)
            .execute()
        )
        return response.data or []
    except Exception as e:
        print(f"Warning: Failed to fetch contacts for company {target_company_id}: {e}")
        return []


def map_contacts_to_company_emails(contacts_data: List[Dict[str, Any]]) -> List[CompanyEmail]:
    """Map database contact rows to CompanyEmail instances."""
    company_emails: List[CompanyEmail] = []
    for c in contacts_data:
        email_str = c.get("email")
        if not email_str:
            continue
        first_name = None
        last_name = None
        full_name = c.get("name")
        if full_name:
            parts = full_name.strip().split()
            first_name = parts[0] if parts else None
            last_name = " ".join(parts[1:]) if len(parts) > 1 else None

        company_emails.append(
            CompanyEmail(
                email=email_str,
                email_of=c.get("role") or "Contact",
                is_verified=bool(c.get("verified_at")),
                first_name=first_name,
                last_name=last_name,
                source=c.get("source") or "contacts_table",
                is_reachable=c.get("is_reachable"),
                is_role_account=c.get("is_role_account"),
            )
        )
    return company_emails


def build_target_company(
    data: Dict[str, Any],
    contacts_data: List[Dict[str, Any]],
) -> Company:
    """Build a Company instance populated with all targeted details and signals."""
    company_emails = map_contacts_to_company_emails(contacts_data)
    raw_signals = data.get("raw_signals") or {}

    # Extract targeted needs and signals with fallback to raw_signals
    needed_skills = (
        data.get("needed_skills")
        or raw_signals.get("needed_skills")
        or raw_signals.get("user_skills")
        or []
    )
    needed_services = (
        data.get("needed_services")
        or raw_signals.get("needed_services")
        or []
    )
    need_signals = (
        data.get("need_signals")
        or raw_signals.get("need_signals")
        or []
    )
    need_hypothesis = (
        data.get("need_hypothesis")
        or raw_signals.get("need_hypothesis")
    )
    proposed_solution = (
        data.get("proposed_solution")
        or raw_signals.get("proposed_solution")
    )
    services_offered = (
        data.get("services_offered")
        or raw_signals.get("services_offered")
        or []
    )
    digital_features = (
        data.get("digital_features")
        or raw_signals.get("digital_features")
        or []
    )

    return Company(
        id=data.get("id"),
        org_id=data.get("org_id"),
        name=data.get("name") or "Target Company",
        domain=data.get("domain") or "",
        website=data.get("website"),
        linkedin_url=data.get("linkedin_url"),
        industry=data.get("industry") or raw_signals.get("industry") or "General Industry",
        size=data.get("size") or "",
        about_text=data.get("about_text") or raw_signals.get("about_text"),
        need_hypothesis=need_hypothesis,
        needed_skills=needed_skills,
        needed_services=needed_services,
        need_signals=need_signals,
        proposed_solution=proposed_solution,
        services_offered=services_offered,
        digital_features=digital_features,
        auth_score=data.get("auth_score") or raw_signals.get("auth_score"),
        auth_feedback=data.get("auth_feedback") or raw_signals.get("auth_feedback"),
        source=data.get("source") or "prospecting",
        raw_signals=raw_signals,
        status=data.get("status", "approved"),
        emails=company_emails,
    )


async def get_company_node(state: EmailGraphState) -> Dict[str, Any]:
    """Node that fetches a company from Supabase using target_company_id with full target details."""
    target_company_id = state.get("target_company_id")
    if not target_company_id:
        return {"errors": state.get("errors", []) + ["Missing target_company_id"]}

    try:
        supabase = await get_supabase_client()
        companies_table = os.environ.get("SUPABASE_COMPANIES_TABLE_NAME", "companies")
        contacts_table = os.environ.get("SUPABASE_CONTACTS_TABLE_NAME", "contacts")

        company_data = await fetch_company_record(supabase, companies_table, target_company_id)
        if not company_data:
            return {"errors": state.get("errors", []) + [f"Company with ID {target_company_id} not found"]}

        contacts_data = await fetch_company_contacts(supabase, contacts_table, target_company_id)
        company = build_target_company(company_data, contacts_data)

        # Identify primary contact ID if available
        primary_contact_id = contacts_data[0].get("id") if contacts_data else None

        return {
            "target_company": company,
            "contact_id": primary_contact_id,
        }
    except Exception as e:
        return {"errors": state.get("errors", []) + [f"Failed to fetch company details from DB: {str(e)}"]}
