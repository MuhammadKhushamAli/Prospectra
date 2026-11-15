"""Helper functions for fetching company records, contacts, and constructing Target Company models."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.models.company import Company, CompanyEmail


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
    except Exception as exc:
        print(f"Warning: Failed to fetch contacts for company {target_company_id}: {exc}")
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
