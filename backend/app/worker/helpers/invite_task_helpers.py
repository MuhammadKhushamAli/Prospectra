"""Background worker task execution logic for dispatching organization invite emails."""

from __future__ import annotations

from typing import Any

from app.core.logging_config import get_node_logger
from app.email.credentials import fetch_org_email_credentials
from app.email.smtp_sender import dispatch_outreach_emails
from app.organization.helpers.invite_email_helpers import (
    build_invite_email_content,
    build_invite_signup_url,
)
from app.organization.helpers.invites_db_helpers import fetch_invite_by_id
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import ORGANIZATIONS_TABLE, USER_PROFILES_TABLE

logger = get_node_logger("worker_invite_task")


async def execute_send_org_invite_email(
    invite_id: str,
    inviter_user_id: str | None = None,
) -> str:
    """Load invite, build personalized email body, and dispatch via verified org SMTP."""
    logger.info(f"[INVITE TASK] Processing invitation email dispatch for invite ID: {invite_id}")
    supabase = await get_supabase_client()

    invite = await fetch_invite_by_id(supabase, invite_id)
    if not invite:
        logger.warning(f"[INVITE TASK] Invite ID {invite_id} not found in database.")
        return "invite_not_found"

    org_id = str(invite["org_id"])
    target_email = str(invite["email"]).strip()
    token = str(invite["token"])

    # Fetch organization name
    org_name = "Your Team"
    try:
        org_res = await (
            supabase.table(ORGANIZATIONS_TABLE)
            .select("name")
            .eq("id", org_id)
            .limit(1)
            .execute()
        )
        if org_res.data and len(org_res.data) > 0:
            org_name = org_res.data[0].get("name") or org_name
    except Exception:
        pass

    # Fetch inviter name
    inviter_id = inviter_user_id or invite.get("invite_by")
    inviter_name = "A teammate"
    if inviter_id:
        try:
            p_res = await (
                supabase.table(USER_PROFILES_TABLE)
                .select("full_name")
                .eq("user_id", inviter_id)
                .limit(1)
                .execute()
            )
            if p_res.data and len(p_res.data) > 0:
                inviter_name = p_res.data[0].get("full_name") or inviter_name
        except Exception:
            pass

    signup_url = build_invite_signup_url(token, target_email)
    subject, body = build_invite_email_content(
        org_name=org_name,
        inviter_name=inviter_name,
        email=target_email,
        signup_url=signup_url,
    )

    try:
        credentials = await fetch_org_email_credentials(org_id)
    except Exception as cred_err:
        logger.error(f"[INVITE TASK] Failed to resolve email credentials for org {org_id}: {cred_err}")
        return "credentials_error"

    successful, _, failed = await dispatch_outreach_emails(
        credentials=credentials,
        recipients=[target_email],
        subject=subject,
        body=body,
        reply_to=credentials.sender_email,
    )

    if successful:
        logger.info(f"[INVITE TASK] Invitation email successfully delivered to {target_email}.")
        return "sent"

    err_str = failed[0]["error"] if failed else "Unknown SMTP error"
    logger.error(f"[INVITE TASK] Failed delivering invitation to {target_email}: {err_str}")
    return "failed"


__all__ = ["execute_send_org_invite_email"]
