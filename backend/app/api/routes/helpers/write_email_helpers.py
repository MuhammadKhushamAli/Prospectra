"""Helper functions for the write-email API route and email generation pre-checks."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import HTTPException

from app.models.job_models import WriteEmailRouteResponse
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import COMPANIES_TABLE, EMAILS_TABLE
from app.utils.constants.email_constants import ALREADY_SENT_ERROR
from app.utils.constants.prospecting_constants import NON_RETRIGGERABLE_COMPANY_STATUSES
from app.utils.helpers.db_status_helpers import is_email_sent


def format_write_email_response(result: Dict[str, Any]) -> Dict[str, Any]:
    """Format the LangGraph email writer workflow result into a standard API response via WriteEmailRouteResponse."""
    if is_email_sent(result.get("existing_email")):
        existing = result.get("existing_email") or {}
        errors = list(result.get("errors", []))
        if ALREADY_SENT_ERROR not in errors:
            errors.append(ALREADY_SENT_ERROR)
        return WriteEmailRouteResponse(
            status="error",
            email_id=result.get("existing_email_id") or existing.get("id"),
            subject=None,
            body=None,
            review_score=None,
            errors=errors,
        ).to_dict()

    generated_email = result.get("generated_email")
    errors = list(result.get("errors", []))
    stored_id = result.get("stored_email_id")

    return WriteEmailRouteResponse(
        status=(
            "success"
            if (generated_email and not errors)
            else ("partial" if generated_email else "error")
        ),
        email_id=stored_id,
        subject=getattr(generated_email, "subject", None),
        body=getattr(generated_email, "body", None),
        review_score=result.get("review_score"),
        errors=errors,
    ).to_dict()


async def validate_company_and_email_for_generation(
    target_company_id: str,
    org_id: str,
) -> None:
    """Raise HTTPException(400) if the target company is rejected or an email was already generated."""
    supabase = await get_supabase_client()

    try:
        comp_res = await (
            supabase.table(COMPANIES_TABLE)
            .select("id, org_id, status, name")
            .eq("id", target_company_id)
            .eq("org_id", org_id)
            .limit(1)
            .execute()
        )
        company_data = comp_res.data[0] if (comp_res and comp_res.data) else None
    except Exception:
        company_data = None

    if company_data:
        comp_status = str(company_data.get("status") or "").strip().lower()
        comp_name = company_data.get("name", target_company_id)
        if comp_status == "rejected":
            raise HTTPException(
                status_code=400,
                detail=f"Company '{comp_name}' is rejected. Email generation cannot be triggered.",
            )
        if comp_status in NON_RETRIGGERABLE_COMPANY_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Outreach email for '{comp_name}' has already been generated. "
                    "The email writer agent cannot be triggered again."
                ),
            )

    try:
        email_res = await (
            supabase.table(EMAILS_TABLE)
            .select("id, status, subject")
            .eq("company_id", target_company_id)
            .limit(1)
            .execute()
        )
        if email_res and email_res.data and len(email_res.data) > 0:
            raise HTTPException(
                status_code=400,
                detail="Outreach email has already been generated for this company. The email writer agent cannot be triggered again.",
            )
    except HTTPException:
        raise
    except Exception:
        pass
