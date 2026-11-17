"""Routes: verify a domain, verify sender email & SMTP config, and read verification status."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.api.auth import authorize_org_member_with_email
from app.api.routes.helpers.domain_route_helpers import fetch_domain_status_payload
from app.domain.verification.service import (
    DOMAIN_VERIFICATION_TABLE,
    add_domain_to_verify,
    domain_verification,
    get_available_email_providers,
    verify_and_save_email_smtp,
)
from app.utils.constants.email_constants import DEFAULT_SMTP_PORT

logger = logging.getLogger(__name__)

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
    smtp_port: int = Field(default=DEFAULT_SMTP_PORT, ge=1, le=65535, description="SMTP server port")
    smtp_username: str | None = None
    smtp_password: str | None = None
    dkim_selector: str | None = None


@router.get("/email-providers")
async def get_email_providers():
    """Return built-in email providers merged with any verified custom ESPs in DB."""
    return {"providers": await get_available_email_providers()}


@router.post("/verify-domain")
async def verify_domain(body: DomainVerifyRequest):
    """Store or verify the organization's domain and required main mailbox email."""
    logger.info(
        "[ROUTE /verify-domain] Request: org_id=%s, domain=%s, smtp_username=%s",
        body.org_id,
        body.domain,
        body.smtp_username,
    )
    _, user_email = await authorize_org_member_with_email(body.token, body.org_id)
    if not body.domain or not body.domain.strip():
        logger.warning("[ROUTE /verify-domain] Validation failed: Domain is required (org_id=%s)", body.org_id)
        raise HTTPException(status_code=400, detail="Domain is required")
    if not body.smtp_username or not body.smtp_username.strip():
        logger.warning("[ROUTE /verify-domain] Validation failed: Main mailbox email is required (org_id=%s)", body.org_id)
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
        logger.info(
            "[ROUTE /verify-domain] Success: org_id=%s, domain=%s, status=%s, verified=%s",
            body.org_id,
            result.get("domain"),
            result.get("verification_status"),
            result.get("verified"),
        )
        return result
    except ValueError as exc:
        logger.warning("[ROUTE /verify-domain] Error for org_id=%s: %s", body.org_id, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/domain-status")
async def domain_status(body: OrgAuthRequest):
    """Re-check DNS verification and return the organization's domain status."""
    logger.info("[ROUTE /domain-status] Request: org_id=%s", body.org_id)
    _, user_email = await authorize_org_member_with_email(body.token, body.org_id)

    try:
        dns_verified = await domain_verification(body.org_id)
        logger.info("[ROUTE /domain-status] DNS check completed: org_id=%s, verified=%s", body.org_id, dns_verified)
    except Exception as exc:
        logger.warning("[ROUTE /domain-status] DNS check exception for org_id=%s: %s", body.org_id, exc)

    payload = await fetch_domain_status_payload(
        org_id=body.org_id,
        user_email=user_email,
        table_name=DOMAIN_VERIFICATION_TABLE,
    )
    logger.info(
        "[ROUTE /domain-status] Status payload: org_id=%s, domain=%s, status=%s, email_status=%s",
        body.org_id,
        payload.get("domain"),
        payload.get("verification_status"),
        payload.get("email_verification_status"),
    )
    return payload


@router.post("/verify-email")
async def verify_email_endpoint(body: EmailSmtpVerifyRequest):
    """Verify the user's email & SMTP configuration after domain verification succeeds."""
    logger.info(
        "[ROUTE /verify-email] Request: org_id=%s, email=%s, provider=%s, smtp_server=%s:%s, smtp_username=%s",
        body.org_id,
        body.email,
        body.email_provider,
        body.smtp_server,
        body.smtp_port,
        body.smtp_username,
    )
    _, user_email = await authorize_org_member_with_email(body.token, body.org_id)
    if not body.smtp_password or not body.smtp_password.strip():
        logger.warning("[ROUTE /verify-email] Validation failed: SMTP app password required (org_id=%s)", body.org_id)
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
        logger.info(
            "[ROUTE /verify-email] Success: org_id=%s, sender=%s, verified=%s, status=%s, smtp_used=%s",
            body.org_id,
            result.sender_email,
            result.verified,
            result.verification_status,
            result.smtp_used,
        )
        return result.to_dict()
    except ValueError as exc:
        logger.warning("[ROUTE /verify-email] Error for org_id=%s: %s", body.org_id, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
