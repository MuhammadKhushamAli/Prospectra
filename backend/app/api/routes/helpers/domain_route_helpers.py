"""Helper functions for the domain verification API routes."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.domain.verification.helpers.dns_helpers import build_dns_instructions, parse_dns_records_dict
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import DOMAIN_VERIFICATION_TABLE
from app.utils.constants.dns_constants import _VERIFICATION_HOST


async def fetch_domain_status_payload(
    org_id: str,
    user_email: str | None,
    table_name: str = DOMAIN_VERIFICATION_TABLE,
) -> dict[str, Any]:
    """Fetch the organization's domain verification row and attach DNS instructions and user_email."""
    supabase = await get_supabase_client()
    response = await (
        supabase
        .table(table_name)
        .select("*")
        .eq("org_id", org_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="No domain verification found")

    data = dict(response.data[0])
    dns_records = parse_dns_records_dict(data.get("dns_records"))
    data["dns_instructions"] = build_dns_instructions(
        token=str(dns_records.get("value", "")),
        host=str(dns_records.get("name", _VERIFICATION_HOST)),
        record_type=str(dns_records.get("type", "TXT")),
    )
    data["user_email"] = user_email
    return data
