"""Routes: verify a domain, verify sender email & SMTP config, and read verification status."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.api.auth import authorize_org_member_with_email
from app.domain.verification.service import (
    DOMAIN_VERIFICATION_TABLE,
    add_domain_to_verify,
    domain_verification,
    get_available_email_providers,
    verify_and_save_email_smtp,
)
from app.services.supabase import get_supabase_client

router = APIRouter()


class DomainVerifyRequest(BaseModel):
    token: str
    org_id: str
    domain: str | None = None
    smtp_username: str | None = None


class OrgAuthRequest(BaseModel):
    token: str
    org_id: str


class EmailSmtpVerifyRequest(BaseModel):
    token: str
    org_id: str
    email: str | None = None
    email_provider: str = Field(..., min_length=1, description="Selected email provider identifier or 'other'")
    custom_email_provider: str | None = None
    smtp_server: str = Field(..., min_length=1, description="SMTP server hostname")
    smtp_port: int = Field(default=587, ge=1, le=65535, description="SMTP server port")
    smtp_username: str | None = None
    smtp_password: str | None = None
    dkim_selector: str | None = None


@router.get("/email-providers")
async def get_email_providers():
    """Return built-in email providers merged with any verified custom ESPs in DB."""
    return {"providers": await get_available_email_providers()}


@router.post("/verify-domain")
async def verify_domain(body: DomainVerifyRequest):
    _, user_email = await authorize_org_member_with_email(body.token, body.org_id)
    if not body.domain or not body.domain.strip():
        raise HTTPException(status_code=400, detail="Domain is required")
    if not body.smtp_username or not body.smtp_username.strip():
        raise HTTPException(
            status_code=400,
            detail="Main mailbox email is required",
        )
    try:
        result = await add_domain_to_verify(
            body.org_id,
            body.domain,
            user_email=user_email,
            smtp_username=body.smtp_username,
        )
        result["user_email"] = user_email
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/domain-status")
async def domain_status(body: OrgAuthRequest):
    _, user_email = await authorize_org_member_with_email(body.token, body.org_id)

    # Re-check verification via DNS before returning status
    try:
        await domain_verification(body.org_id)
    except Exception:
        pass

    supabase = await get_supabase_client()
    response = await (
        supabase
        .table(DOMAIN_VERIFICATION_TABLE)
        .select("*")
        .eq("org_id", body.org_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="No domain verification found")
    data = dict(response.data[0])
    dns_records = data.get("dns_records") or {}
    data["dns_instructions"] = {
        "title": "Add this DNS record to your domain provider:",
        "type": dns_records.get("type", "TXT"),
        "host": dns_records.get("name", "_prospectra"),
        "value": dns_records.get("value", ""),
    }
    data["user_email"] = user_email
    return data


@router.post("/verify-email")
async def verify_email_endpoint(body: EmailSmtpVerifyRequest):
    """Verify the user's email & SMTP configuration after domain verification succeeds."""
    _, user_email = await authorize_org_member_with_email(body.token, body.org_id)
    if not body.smtp_password or not body.smtp_password.strip():
        raise HTTPException(
            status_code=400,
            detail="SMTP app password is required.",
        )
    try:
        result = await verify_and_save_email_smtp(
            org_id=body.org_id,
            sender_email=body.email or user_email or "",
            user_email=user_email,
            email_provider=body.email_provider,
            custom_email_provider=body.custom_email_provider,
            smtp_server=body.smtp_server,
            smtp_port=body.smtp_port,
            smtp_username=body.smtp_username,
            smtp_password=body.smtp_password,
            dkim_selector=body.dkim_selector,
        )
        return result.to_dict()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

