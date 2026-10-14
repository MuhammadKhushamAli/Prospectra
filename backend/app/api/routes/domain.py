"""Routes: verify a domain and read its verification status."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.auth import authorize_org_member
from app.domain.verification.service import (
    DOMAIN_VERIFICATION_TABLE,
    add_domain_to_verify,
    domain_verification,
)
from app.services.supabase import get_supabase_client

router = APIRouter()


class DomainVerifyRequest(BaseModel):
    token: str
    org_id: str
    domain: str | None = None


class OrgAuthRequest(BaseModel):
    token: str
    org_id: str


@router.post("/verify-domain")
async def verify_domain(body: DomainVerifyRequest):
    await authorize_org_member(body.token, body.org_id)
    if not body.domain:
        raise HTTPException(status_code=400, detail="Domain is required")
    result = await add_domain_to_verify(body.org_id, body.domain)
    return result


@router.post("/domain-status")
async def domain_status(body: OrgAuthRequest):
    await authorize_org_member(body.token, body.org_id)

    # Re-check verification via DNS before returning status
    try:
        await domain_verification(body.org_id)
    except Exception:
        pass

    supabase = await get_supabase_client()
    response = await (
        supabase
        .table(DOMAIN_VERIFICATION_TABLE)
        .select("domain, verification_status, dns_records, verified_at, esp_provider")
        .eq("org_id", body.org_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="No domain verification found")
    data = response.data[0]
    dns_records = data.get("dns_records") or {}
    data["dns_instructions"] = {
        "title": "Add this DNS record to your domain provider:",
        "type": dns_records.get("type", "TXT"),
        "host": dns_records.get("name", "_prospectra"),
        "value": dns_records.get("value", ""),
    }
    return data
