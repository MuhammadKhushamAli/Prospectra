"""Routes: verify a domain and read its verification status."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.auth import authorize_org_member
from app.domain.verification.service import DOMAIN_VERIFICATION_TABLE, domain_verification
from app.services.supabase import get_supabase_client

router = APIRouter()


class OrgAuthRequest(BaseModel):
    token: str
    org_id: str


@router.post("/verify-domain")
async def verify_domain(body: OrgAuthRequest):
    await authorize_org_member(body.token, body.org_id)
    verified = await domain_verification(body.org_id)
    return {"verified": verified}


@router.post("/domain-status")
async def domain_status(body: OrgAuthRequest):
    await authorize_org_member(body.token, body.org_id)

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
    return response.data[0]
