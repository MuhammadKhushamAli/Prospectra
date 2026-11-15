"""ARQ worker configuration and task definitions for Prospectra.

Each worker task calls the predefined backend workflow functions (which update the
database directly so changes reflect in the frontend automatically), marks the
job status in Redis as 'done' or 'not_done', and fires the job status webhook to notify the frontend.
"""

from __future__ import annotations

import asyncio
import signal
from typing import Any

from arq.cron import cron

from app.core.arq_config import (
    ARQ_JOB_TIMEOUT_SECONDS,
    ARQ_KEEP_RESULT_SECONDS,
    ARQ_MAX_JOBS,
    ARQ_QUEUE_NAME,
    get_redis_settings,
    trigger_job_webhook,
    update_job_status,
)
from app.core.logging_config import get_node_logger, setup_colored_logging

# Initialize colored logging for ARQ worker process
setup_colored_logging()
logger = get_node_logger("arq_worker")

# Windows compatibility for arq.worker.Worker.close() which references signal.SIGUSR1
if not hasattr(signal, "SIGUSR1"):
    setattr(signal, "SIGUSR1", signal.SIGINT)


async def search_companies_arq_task(
    ctx: dict[str, Any],
    user_id: str,
    org_id: str,
    threshold: int,
) -> str:
    """
    ARQ job: Call the predefined `_search_until_threshold` function (which runs
    `run_prospect_workflow` and updates the DB directly), mark the job status in Redis,
    and fire the webhook to notify the frontend when done or failed.
    """
    from app.api.routes.company_search import _search_until_threshold

    job_id = str(ctx.get("job_id") or f"search-company-{org_id}")
    redis_conn = ctx.get("redis")
    logger.info(f"[ARQ WORKER] Picked up job '{job_id}' -> search_companies_arq_task (org_id={org_id}, threshold={threshold})")

    await update_job_status(
        job_id=job_id,
        task_name="search_companies_arq_task",
        status="in_progress",
        redis_conn=redis_conn,
    )

    try:
        succeeded = await _search_until_threshold(user_id, org_id, threshold)
        if succeeded is False:
            await update_job_status(
                job_id=job_id,
                task_name="search_companies_arq_task",
                status="not_done",
                error="Company search finished without discovering new companies.",
                redis_conn=redis_conn,
            )
            await trigger_job_webhook(
                job_id=job_id,
                task_name="search_companies_arq_task",
                org_id=org_id,
                status="failed",
                message="Company search failed to find new prospects. You can retry fetching.",
                error="No new companies discovered",
            )
            return "not_done"

        await update_job_status(
            job_id=job_id,
            task_name="search_companies_arq_task",
            status="done",
            redis_conn=redis_conn,
        )
        await trigger_job_webhook(
            job_id=job_id,
            task_name="search_companies_arq_task",
            org_id=org_id,
            status="done",
            message="Company search completed! Discovered companies are ready for review.",
        )
        return "done"
    except asyncio.CancelledError as exc:
        logger.error(f"[ARQ WORKER] Job {job_id} cancelled or timed out: {exc}", exc=exc)
        await update_job_status(
            job_id=job_id,
            task_name="search_companies_arq_task",
            status="not_done",
            error="Company search job timed out or was cancelled.",
            redis_conn=redis_conn,
        )
        await trigger_job_webhook(
            job_id=job_id,
            task_name="search_companies_arq_task",
            org_id=org_id,
            status="failed",
            message="Company search timed out. Please retry fetching companies.",
            error="TimeoutError",
        )
        raise exc
    except Exception as exc:
        logger.error(f"[ARQ WORKER] Job {job_id} failed: {exc}", exc=exc)
        await update_job_status(
            job_id=job_id,
            task_name="search_companies_arq_task",
            status="not_done",
            error=str(exc),
            redis_conn=redis_conn,
        )
        await trigger_job_webhook(
            job_id=job_id,
            task_name="search_companies_arq_task",
            org_id=org_id,
            status="failed",
            message="Company search failed. Please retry fetching companies.",
            error=str(exc),
        )
        return "not_done"


async def write_email_arq_task(
    ctx: dict[str, Any],
    user_id: str,
    org_id: str,
    target_company_id: str,
    recipient_emails: list[str] | None = None,
    org_domain: str | None = None,
    user_feedback: str | None = None,
) -> str:
    """
    ARQ job: Call the predefined `run_email_writer_workflow` function (and
    `revert_company_status_to_pending` on failure), which updates the DB directly,
    mark the job status as 'done' or 'not_done' in Redis, and fire the webhook to notify the frontend.
    """
    from app.api.routes.write_email import (
        format_write_email_response,
        revert_company_status_to_pending,
    )
    from app.langgraph.email_writer.graph import run_email_writer_workflow
    from app.langgraph.email_writer.tools.get_existing_email_tool import is_email_sent

    job_id = str(ctx.get("job_id") or f"write-email-{target_company_id}")
    redis_conn = ctx.get("redis")
    logger.info(f"[ARQ WORKER] Picked up job '{job_id}' -> write_email_arq_task (org_id={org_id}, company_id={target_company_id})")

    await update_job_status(
        job_id=job_id,
        task_name="write_email_arq_task",
        status="in_progress",
        redis_conn=redis_conn,
    )

    # Pre-check: Ensure company is not rejected and email not already generated
    try:
        from app.services.supabase import get_supabase_client
        supabase = await get_supabase_client()
        comp_res = await supabase.table("companies").select("id, status").eq("id", target_company_id).limit(1).execute()
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

        email_res = await supabase.table("emails").select("id").eq("company_id", target_company_id).limit(1).execute()
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

    try:
        result = await run_email_writer_workflow(
            user_id=user_id,
            org_id=org_id,
            target_company_id=target_company_id,
            recipient_emails=recipient_emails,
            org_domain=org_domain,
            user_feedback=user_feedback,
        )
        response_data = format_write_email_response(result)
        already_sent = is_email_sent(result.get("existing_email"))
        has_failure = (
            response_data.get("status") == "error"
            or not response_data.get("body")
            or not response_data.get("email_id")
            or bool(response_data.get("errors"))
        )
        if has_failure:
            if not already_sent:
                await revert_company_status_to_pending(target_company_id, org_id)
            err_msg = "; ".join(response_data.get("errors") or ["Email generation failed"])
            await update_job_status(
                job_id=job_id,
                task_name="write_email_arq_task",
                status="not_done",
                error=err_msg,
                redis_conn=redis_conn,
            )
            await trigger_job_webhook(
                job_id=job_id,
                task_name="write_email_arq_task",
                org_id=org_id,
                company_id=target_company_id,
                status="failed",
                message="Outreach email generation failed.",
                error=err_msg,
            )
            return "not_done"

        await update_job_status(
            job_id=job_id,
            task_name="write_email_arq_task",
            status="done",
            redis_conn=redis_conn,
        )
        await trigger_job_webhook(
            job_id=job_id,
            task_name="write_email_arq_task",
            org_id=org_id,
            company_id=target_company_id,
            status="done",
            message=(
                "Outreach email regenerated with your feedback!"
                if user_feedback
                else "Outreach email draft generated and ready for review!"
            ),
        )
        return "done"
    except asyncio.CancelledError as exc:
        await revert_company_status_to_pending(target_company_id, org_id)
        await update_job_status(
            job_id=job_id,
            task_name="write_email_arq_task",
            status="not_done",
            error="Email generation job timed out or was cancelled.",
            redis_conn=redis_conn,
        )
        await trigger_job_webhook(
            job_id=job_id,
            task_name="write_email_arq_task",
            org_id=org_id,
            company_id=target_company_id,
            status="failed",
            message="Outreach email generation timed out.",
            error="TimeoutError",
        )
        raise exc
    except Exception as exc:
        await revert_company_status_to_pending(target_company_id, org_id)
        await update_job_status(
            job_id=job_id,
            task_name="write_email_arq_task",
            status="not_done",
            error=str(exc),
            redis_conn=redis_conn,
        )
        await trigger_job_webhook(
            job_id=job_id,
            task_name="write_email_arq_task",
            org_id=org_id,
            company_id=target_company_id,
            status="failed",
            message="Outreach email generation failed.",
            error=str(exc),
        )
        return "not_done"


async def _revert_email_to_draft_safe(email_id: str) -> None:
    """Revert an email's status back to 'draft' (Pending) if worker SMTP dispatch fails."""
    try:
        from app.services.supabase import get_supabase_client
        supabase = await get_supabase_client()
        await supabase.table("emails").update({"status": "draft"}).eq("id", email_id).execute()
    except Exception:
        pass


async def send_email_arq_task(
    ctx: dict[str, Any],
    org_id: str,
    email_id: str,
    company_id: str | None = None,
    recipient_emails: list[str] | None = None,
    custom_subject: str | None = None,
    custom_body: str | None = None,
) -> str:
    """
    ARQ job: Send an outreach email via SMTP (aiosmtplib) using the organization's
    verified credentials, update database records, mark job status in Redis,
    and fire the webhook to notify the frontend.
    """
    from app.email.service import send_company_outreach_email

    job_id = str(ctx.get("job_id") or f"send-email-{email_id}")
    redis_conn = ctx.get("redis")
    logger.info(
        f"[ARQ WORKER] Picked up job '{job_id}' -> send_email_arq_task "
        f"(org_id={org_id}, email_id={email_id}, company_id={company_id})"
    )

    await update_job_status(
        job_id=job_id,
        task_name="send_email_arq_task",
        status="in_progress",
        redis_conn=redis_conn,
    )

    try:
        result = await send_company_outreach_email(
            org_id=org_id,
            email_id=email_id,
            company_id=company_id,
            recipient_emails=recipient_emails,
            custom_subject=custom_subject,
            custom_body=custom_body,
        )
        await update_job_status(
            job_id=job_id,
            task_name="send_email_arq_task",
            status="done",
            redis_conn=redis_conn,
        )
        await trigger_job_webhook(
            job_id=job_id,
            task_name="send_email_arq_task",
            org_id=org_id,
            company_id=company_id,
            email_id=email_id,
            status="done",
            message=result.message,
        )
        return "done"
    except asyncio.CancelledError as exc:
        logger.error(f"[ARQ WORKER] Send email job {job_id} timed out or cancelled: {exc}")
        await _revert_email_to_draft_safe(email_id)
        await update_job_status(
            job_id=job_id,
            task_name="send_email_arq_task",
            status="not_done",
            error="Outreach email dispatch timed out or was cancelled.",
            redis_conn=redis_conn,
        )
        await trigger_job_webhook(
            job_id=job_id,
            task_name="send_email_arq_task",
            org_id=org_id,
            company_id=company_id,
            email_id=email_id,
            status="failed",
            message="Outreach email dispatch timed out.",
            error="TimeoutError",
        )
        raise exc
    except Exception as exc:
        logger.error(f"[ARQ WORKER] Send email job {job_id} failed: {exc}")
        await _revert_email_to_draft_safe(email_id)
        await update_job_status(
            job_id=job_id,
            task_name="send_email_arq_task",
            status="not_done",
            error=str(exc),
            redis_conn=redis_conn,
        )
        await trigger_job_webhook(
            job_id=job_id,
            task_name="send_email_arq_task",
            org_id=org_id,
            company_id=company_id,
            email_id=email_id,
            status="failed",
            message=f"Failed to send outreach email: {exc}",
            error=str(exc),
        )
        return "not_done"


async def check_email_replies_arq_task(
    ctx: dict[str, Any],
    org_id: str | None = None,
) -> str:
    """
    ARQ job: Inspect mailbox for an organization (or all active orgs when org_id is None)
    using imap-tools. Detects replies, marks database records as 'replied', and broadcasts
    webhooks to trigger native mobile notifications in the app.
    """
    from app.email.imap_checker import detect_replies_for_all_active_orgs, detect_replies_for_org

    job_id = str(ctx.get("job_id") or f"check-replies-{org_id or 'all'}")
    redis_conn = ctx.get("redis")
    logger.info(f"[ARQ WORKER] Picked up job '{job_id}' -> check_email_replies_arq_task (org_id={org_id or 'all'})")

    await update_job_status(
        job_id=job_id,
        task_name="check_email_replies_arq_task",
        status="in_progress",
        redis_conn=redis_conn,
    )

    try:
        if org_id:
            detected = await detect_replies_for_org(org_id)
        else:
            detected = await detect_replies_for_all_active_orgs()

        await update_job_status(
            job_id=job_id,
            task_name="check_email_replies_arq_task",
            status="done",
            redis_conn=redis_conn,
        )
        if org_id:
            await trigger_job_webhook(
                job_id=job_id,
                task_name="check_email_replies_arq_task",
                org_id=org_id,
                status="done",
                message=f"IMAP reply check complete. {len(detected)} new reply(s) detected.",
            )
        return "done"
    except Exception as exc:
        logger.error(f"[ARQ WORKER] Reply check failed for org {org_id}: {exc}")
        await update_job_status(
            job_id=job_id,
            task_name="check_email_replies_arq_task",
            status="not_done",
            error=str(exc),
            redis_conn=redis_conn,
        )
        if org_id:
            await trigger_job_webhook(
                job_id=job_id,
                task_name="check_email_replies_arq_task",
                org_id=org_id,
                status="failed",
                message=f"Failed to check email replies: {exc}",
                error=str(exc),
            )
        return "not_done"


async def on_worker_startup(ctx: dict[str, Any]) -> None:
    """Lifecycle hook executed when the ARQ worker starts."""
    logger.info(f"[ARQ WORKER] Started listening on queue '{ARQ_QUEUE_NAME}'.")


async def on_worker_shutdown(ctx: dict[str, Any]) -> None:
    """Lifecycle hook executed when the ARQ worker shuts down."""
    logger.info(f"[ARQ WORKER] Shutting down worker for queue '{ARQ_QUEUE_NAME}'.")


class WorkerSettings:
    """ARQ WorkerSettings class used by `arq app.worker.worker_config.WorkerSettings` and `backend/worker.py`."""

    functions = [
        search_companies_arq_task,
        write_email_arq_task,
        send_email_arq_task,
        check_email_replies_arq_task,
    ]
    cron_jobs = [
        cron(
            check_email_replies_arq_task,
            minute=set(range(0, 60, 2)),
            run_at_startup=False,
        ),
    ]
    redis_settings = get_redis_settings()
    queue_name = ARQ_QUEUE_NAME
    job_timeout = ARQ_JOB_TIMEOUT_SECONDS
    keep_result = ARQ_KEEP_RESULT_SECONDS
    max_jobs = ARQ_MAX_JOBS
    on_startup = on_worker_startup
    on_shutdown = on_worker_shutdown
