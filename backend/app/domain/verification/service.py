"""Public operations for starting and completing domain verification."""

from __future__ import annotations

from dataclasses import asdict

from app.models.domain_verification import DomainVerification
from app.services.supabase import get_supabase_client

from .dns import is_verified, new_token, normalize_domain, _VERIFICATION_HOST
from app.models.dns_record import DNSRecord

import os

DOMAIN_VERIFICATION_TABLE = os.environ.get("DOMAIN_VERIFICATION_TABLE")

if not DOMAIN_VERIFICATION_TABLE:
    raise ValueError("DOMAIN_VERIFICATION_TABLE environment variable is not set")



async def add_domain_to_verify(org_id: str, domain: str) -> dict[str, str]:
    """Store a pending domain verification and return its DNS token."""
    normalized_domain = normalize_domain(domain)
    token = new_token()
    verification = DomainVerification(
        org_id=org_id,
        domain=normalized_domain,
        dns_records=asdict(
            DNSRecord(
                type="TXT",
                name=_VERIFICATION_HOST,
                value=token,
            )
        ),
        verification_status="pending",
        verified_at=None,
        created_at=None,
    )

    row = asdict(verification)
    row.pop("created_at")
    supabase_client = await get_supabase_client()
    await supabase_client.table(DOMAIN_VERIFICATION_TABLE).upsert(
        row,
        on_conflict="org_id,domain",
    ).execute()

    return {"domain": normalized_domain, "token": token}


async def domain_verification(org_id: str) -> bool:
    """Verify the organization's stored domain token through DNS."""
    supabase_client = await get_supabase_client()
    response = await (
        supabase_client
        .table(DOMAIN_VERIFICATION_TABLE)
        .select("domain, dns_records")
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    record = response.data
    verification_status = await is_verified(record["domain"], record["dns_records"]["value"])

    if verification_status:
        await supabase_client.table(DOMAIN_VERIFICATION_TABLE).update(
            {"verification_status": "verified"}
        ).eq("org_id", org_id).eq("domain", record["domain"]).execute()
    else:
        await supabase_client.table(DOMAIN_VERIFICATION_TABLE).update(
            {"verification_status": "failed"}
        ).eq("org_id", org_id).eq("domain", record["domain"]).execute()

    return verification_status
