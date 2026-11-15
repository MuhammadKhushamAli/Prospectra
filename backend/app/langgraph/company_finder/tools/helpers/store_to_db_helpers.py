"""Helper functions for building and persisting accepted company and contact records in Supabase."""

from __future__ import annotations

from typing import Any, Dict, List

from app.core.logging_config import get_node_logger
from app.models.company import Company
from app.models.summaries import CompanyDatabaseRecord, ContactDatabaseRecord
from app.utils.constants.db_tables import (
    COMPANIES_TABLE,
    CONTACTS_TABLE,
)

logger = get_node_logger("store_to_db")


def build_company_db_records(accepted_companies: List[Company]) -> List[Dict[str, Any]]:
    """Convert accepted Company instances into Supabase companies table row dicts via CompanyDatabaseRecord."""
    return [
        CompanyDatabaseRecord.from_company(company).to_db_payload()
        for company in accepted_companies
    ]


async def upsert_companies_and_resolve_ids(
    supabase: Any,
    company_records: List[Dict[str, Any]],
    accepted_companies: List[Company],
) -> Dict[str, str]:
    """Upsert company records into Supabase and return a domain -> company_id map."""
    upsert_res = (
        await supabase.table(COMPANIES_TABLE)
        .upsert(company_records, on_conflict="org_id,domain")
        .execute()
    )
    saved_rows = upsert_res.data or []
    logger.info(f"[STORE TO DB] Upserted {len(company_records)} company record(s) into '{COMPANIES_TABLE}'.")

    domain_to_id: Dict[str, str] = {}
    for row in saved_rows:
        if row.get("domain") and row.get("id"):
            domain_to_id[row["domain"].lower()] = str(row["id"])

    for company in accepted_companies:
        dom = company.domain.lower()
        if dom not in domain_to_id:
            domain_to_id[dom] = str(company.id)

    return domain_to_id


def build_verified_contact_records(
    accepted_companies: List[Company],
    domain_to_id: Dict[str, str],
    now_iso: str,
) -> List[Dict[str, Any]]:
    """Build deduplicated contact row dicts for all verified company emails via ContactDatabaseRecord."""
    contact_records: List[Dict[str, Any]] = []
    seen_contact_keys: set[tuple[str, str]] = set()

    for company in accepted_companies:
        comp_id = domain_to_id.get(company.domain.lower())
        if not comp_id:
            continue

        for email_obj in company.emails:
            if not email_obj.is_verified:
                continue
            clean_email = email_obj.email.lower().strip()
            if not clean_email or (comp_id, clean_email) in seen_contact_keys:
                continue
            seen_contact_keys.add((comp_id, clean_email))
            record = ContactDatabaseRecord.from_company_email(
                company_id=comp_id,
                email_obj=email_obj,
                verified_at=now_iso,
            )
            contact_records.append(record.to_dict())
    return contact_records


async def persist_verified_contacts(
    supabase: Any,
    contact_records: List[Dict[str, Any]],
) -> None:
    """Upsert verified contact records into Supabase with per-row insert fallback."""
    if not contact_records:
        return
    try:
        await supabase.table(CONTACTS_TABLE).upsert(contact_records).execute()
        logger.info(f"[STORE TO DB] Upserted {len(contact_records)} verified contact email(s) into '{CONTACTS_TABLE}'.")
    except Exception:
        stored_count = 0
        for rec_item in contact_records:
            try:
                await supabase.table(CONTACTS_TABLE).insert(rec_item).execute()
                stored_count += 1
            except Exception:
                pass
        logger.info(f"[STORE TO DB] Stored {stored_count}/{len(contact_records)} verified contact email(s) into '{CONTACTS_TABLE}'.")
