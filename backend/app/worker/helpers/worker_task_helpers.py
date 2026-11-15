"""Helper functions for ARQ worker tasks, pre-checks, status updates, and webhook notifications."""

from __future__ import annotations

from typing import Any

from app.core.arq_config import trigger_job_webhook, update_job_status
from app.core.logging_config import get_node_logger
from app.services.supabase import get_supabase_client
from app.utils.constants.db_tables import COMPANIES_TABLE, EMAILS_TABLE

logger = get_node_logger("arq_worker")


async def precheck_company_and_email_for_writer(
    target_company_id: str,
    job_id: str,
    redis_conn: Any | None = None,
) -> str | None:
    """Return 'not_done' if company is rejected, 'done' if email already exists, or None to proceed."""
    try:
        supabase = await get_supabase_client()
        comp_res = (
            await supabase.table(COMPANIES_TABLE)
            .select("id, status")
            .eq("id", target_company_id)
            .limit(1)
            .execute()
        )
        comp_row = comp_res.data[0] if (comp_res and comp_res.data) else None
        if comp_row and str(comp_row.get("status") or "").strip().lower() == "rejected":
            logger.warning(f"[ARQ WORKER] Company {target_company_id} is rejected. Aborting email writer task.")
            await update_job_status(
                job_id=job_id,
                task_name="write_email_arq_task",
                status="not_done",
                error="Company is rejected. Email generation is not allowed.",
                redis_conn=redis_conn,
            )
            return "not_done"

        email_res = (
            await supabase.table(EMAILS_TABLE)
            .select("id")
            .eq("company_id", target_company_id)
            .limit(1)
            .execute()
        )
        if email_res and email_res.data and len(email_res.data) > 0:
            logger.warning(f"[ARQ WORKER] Email already generated for company {target_company_id}. Aborting email writer task.")
            await update_job_status(
                job_id=job_id,
                task_name="write_email_arq_task",
                status="done",
                redis_conn=redis_conn,
            )
            return "done"
    except Exception as precheck_err:
        logger.warning(f"[ARQ WORKER] Pre-check warning for {target_company_id}: {precheck_err}")
    return None


async def mark_job_done_and_notify(
    job_id: str,
    task_name: str,
    org_id: str | None,
    message: str,
    redis_conn: Any | None = None,
    company_id: str | None = None,
    email_id: str | None = None,
) -> str:
    """Update job status in Redis to 'done' and fire the 'done' webhook if org_id is present."""
    await update_job_status(
        job_id=job_id,
        task_name=task_name,
        status="done",
        redis_conn=redis_conn,
    )
    if org_id:
        await trigger_job_webhook(
            job_id=job_id,
            task_name=task_name,
            org_id=org_id,
            company_id=company_id,
            email_id=email_id,
            status="done",
            message=message,
        )
    return "done"


async def mark_job_failed_and_notify(
    job_id: str,
    task_name: str,
    org_id: str | None,
    message: str,
    error: str,
    redis_conn: Any | None = None,
    company_id: str | None = None,
    email_id: str | None = None,
) -> str:
    """Update job status in Redis to 'not_done' and fire the 'failed' webhook if org_id is present."""
    await update_job_status(
        job_id=job_id,
        task_name=task_name,
        status="not_done",
        error=error,
        redis_conn=redis_conn,
    )
    if org_id:
        await trigger_job_webhook(
            job_id=job_id,
            task_name=task_name,
            org_id=org_id,
            company_id=company_id,
            email_id=email_id,
            status="failed",
            message=message,
            error=error,
        )
    return "not_done"
