"""LangGraph node for storing accepted companies and verified contacts to Supabase."""

from typing import Any, Dict

from app.core.logging_config import get_node_logger
from app.langgraph.company_finder.state.state import GraphState
from app.langgraph.company_finder.tools.helpers.store_to_db_helpers import (
    build_company_db_records,
    build_verified_contact_records,
    persist_verified_contacts,
    upsert_companies_and_resolve_ids,
)
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import (
    COMPANIES_TABLE,
    COMPANY_DB_COLUMNS,
    CONTACTS_TABLE,
)
from app.utils.helpers.time_helpers import utc_now_iso

logger = get_node_logger("store_to_db")


async def store_to_db_node(state: GraphState) -> Dict[str, Any]:
    """Node that persists accepted companies and their Reacher-verified emails to Supabase."""
    accepted_companies = [
        c
        for c in state.get("accepted_companies", [])
        if any(getattr(e, "is_verified", False) for e in (c.emails or []))
    ]
    if not accepted_companies:
        logger.info("[STORE TO DB] 0 accepted companies with verified emails to store.")
        return {}

    errors = list(state.get("errors", []))

    try:
        supabase = await get_supabase_client()
        now_iso = utc_now_iso()

        company_records = build_company_db_records(accepted_companies)
        if company_records:
            domain_to_id = await upsert_companies_and_resolve_ids(
                supabase=supabase,
                company_records=company_records,
                accepted_companies=accepted_companies,
            )
            contact_records = build_verified_contact_records(
                accepted_companies=accepted_companies,
                domain_to_id=domain_to_id,
                now_iso=now_iso,
            )
            await persist_verified_contacts(supabase, contact_records)

    except Exception as exc:
        error_msg = f"Failed to store companies to Supabase: {str(exc)}"
        logger.error(f"[STORE TO DB] {error_msg}", exc=exc)
        if error_msg not in errors:
            errors.append(error_msg)
        return {"errors": errors}

    return {"errors": errors}


__all__ = [
    "COMPANIES_TABLE",
    "CONTACTS_TABLE",
    "COMPANY_DB_COLUMNS",
    "store_to_db_node",
]
