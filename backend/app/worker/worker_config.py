"""ARQ worker configuration and task definitions for Prospectra."""

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
    update_job_status,
)
from app.core.logging_config import get_node_logger, setup_colored_logging
from app.utils.helpers.db_status_helpers import (
    is_email_sent,
    revert_company_status_to_pending,
    revert_email_to_draft_safe,
)
from app.worker.helpers.worker_task_helpers import (
    mark_job_done_and_notify,
    mark_job_failed_and_notify,
    precheck_company_and_email_for_writer,
)

setup_colored_logging()
logger = get_node_logger("arq_worker")

if not hasattr(signal, "SIGUSR1"):
    setattr(signal, "SIGUSR1", signal.SIGINT)

_revert_email_to_draft_safe = revert_email_to_draft_safe


async def search_companies_arq_task(
    ctx: dict[str, Any],
    user_id: str,
    org_id: str,
    threshold: int,
) -> str:
    """ARQ job: Run `_search_until_threshold`, update Redis job status, and fire webhook."""
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
            return await mark_job_failed_and_notify(
                job_id=job_id,
                task_name="search_companies_arq_task",
                org_id=org_id,
                message="Company search failed to find new prospects. You can retry fetching.",
                error="No new companies discovered",
                redis_conn=redis_conn,
            )

        return await mark_job_done_and_notify(
            job_id=job_id,
            task_name="search_companies_arq_task",
            org_id=org_id,
            message="Company search completed! Discovered companies are ready for review.",
            redis_conn=redis_conn,
        )
    except asyncio.CancelledError as exc:
        logger.error(f"[ARQ WORKER] Job {job_id} cancelled or timed out: {exc}", exc=exc)
        await mark_job_failed_and_notify(
            job_id=job_id,
            task_name="search_companies_arq_task",
            org_id=org_id,
            message="Company search timed out. Please retry fetching companies.",
            error="TimeoutError",
            redis_conn=redis_conn,
        )
        raise exc
    except Exception as exc:
        logger.error(f"[ARQ WORKER] Job {job_id} failed: {exc}", exc=exc)
        return await mark_job_failed_and_notify(
            job_id=job_id,
            task_name="search_companies_arq_task",
            org_id=org_id,
            message="Company search failed. Please retry fetching companies.",
            error=str(exc),
            redis_conn=redis_conn,
        )


async def write_email_arq_task(
    ctx: dict[str, Any],
    user_id: str,
    org_id: str,
    target_company_id: str,
    recipient_emails: list[str] | None = None,
    org_domain: str | None = None,
    user_feedback: str | None = None,
) -> str:
    """ARQ job: Run `run_email_writer_workflow`, update DB/Redis, and fire webhook."""
    from app.api.routes.write_email import format_write_email_response
    from app.langgraph.email_writer.graph import run_email_writer_workflow

    job_id = str(ctx.get("job_id") or f"write-email-{target_company_id}")
    redis_conn = ctx.get("redis")
    logger.info(f"[ARQ WORKER] Picked up job '{job_id}' -> write_email_arq_task (org_id={org_id}, company_id={target_company_id})")

    await update_job_status(
        job_id=job_id,
        task_name="write_email_arq_task",
        status="in_progress",
        redis_conn=redis_conn,
    )

    precheck_status = await precheck_company_and_email_for_writer(
        target_company_id=target_company_id,
        job_id=job_id,
        redis_conn=redis_conn,
    )
    if precheck_status is not None:
        return precheck_status

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
            return await mark_job_failed_and_notify(
                job_id=job_id,
                task_name="write_email_arq_task",
                org_id=org_id,
                company_id=target_company_id,
                message="Outreach email generation failed.",
                error=err_msg,
                redis_conn=redis_conn,
            )

        return await mark_job_done_and_notify(
            job_id=job_id,
            task_name="write_email_arq_task",
            org_id=org_id,
            company_id=target_company_id,
            message=(
                "Outreach email regenerated with your feedback!"
                if user_feedback
                else "Outreach email draft generated and ready for review!"
            ),
            redis_conn=redis_conn,
        )
    except asyncio.CancelledError as exc:
        await revert_company_status_to_pending(target_company_id, org_id)
        await mark_job_failed_and_notify(
            job_id=job_id,
            task_name="write_email_arq_task",
            org_id=org_id,
            company_id=target_company_id,
            message="Outreach email generation timed out.",
            error="TimeoutError",
            redis_conn=redis_conn,
        )
        raise exc
    except Exception as exc:
        await revert_company_status_to_pending(target_company_id, org_id)
        return await mark_job_failed_and_notify(
            job_id=job_id,
            task_name="write_email_arq_task",
            org_id=org_id,
            company_id=target_company_id,
            message="Outreach email generation failed.",
            error=str(exc),
            redis_conn=redis_conn,
        )


async def send_email_arq_task(
    ctx: dict[str, Any],
    org_id: str,
    email_id: str,
    company_id: str | None = None,
    recipient_emails: list[str] | None = None,
    custom_subject: str | None = None,
    custom_body: str | None = None,
) -> str:
    """ARQ job: Send an outreach email via SMTP, update DB records, and fire webhook."""
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
        return await mark_job_done_and_notify(
            job_id=job_id,
            task_name="send_email_arq_task",
            org_id=org_id,
            company_id=company_id,
            email_id=email_id,
            message=result.message,
            redis_conn=redis_conn,
        )
    except asyncio.CancelledError as exc:
        logger.error(f"[ARQ WORKER] Send email job {job_id} timed out or cancelled: {exc}")
        await revert_email_to_draft_safe(email_id)
        await mark_job_failed_and_notify(
            job_id=job_id,
            task_name="send_email_arq_task",
            org_id=org_id,
            company_id=company_id,
            email_id=email_id,
            message="Outreach email dispatch timed out.",
            error="TimeoutError",
            redis_conn=redis_conn,
        )
        raise exc
    except Exception as exc:
        logger.error(f"[ARQ WORKER] Send email job {job_id} failed: {exc}")
        await revert_email_to_draft_safe(email_id)
        return await mark_job_failed_and_notify(
            job_id=job_id,
            task_name="send_email_arq_task",
            org_id=org_id,
            company_id=company_id,
            email_id=email_id,
            message=f"Failed to send outreach email: {exc}",
            error=str(exc),
            redis_conn=redis_conn,
        )


async def check_email_replies_arq_task(
    ctx: dict[str, Any],
    org_id: str | None = None,
) -> str:
    """ARQ job: Inspect mailbox for an organization (or all active orgs) via imap-tools."""
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
        detected = (
            await detect_replies_for_org(org_id)
            if org_id
            else await detect_replies_for_all_active_orgs()
        )
        return await mark_job_done_and_notify(
            job_id=job_id,
            task_name="check_email_replies_arq_task",
            org_id=org_id,
            message=f"IMAP reply check complete. {len(detected)} new reply(s) detected.",
            redis_conn=redis_conn,
        )
    except Exception as exc:
        logger.error(f"[ARQ WORKER] Reply check failed for org {org_id}: {exc}")
        return await mark_job_failed_and_notify(
            job_id=job_id,
            task_name="check_email_replies_arq_task",
            org_id=org_id,
            message=f"Failed to check email replies: {exc}",
            error=str(exc),
            redis_conn=redis_conn,
        )


async def send_org_invite_email_task(
    ctx: dict[str, Any],
    invite_id: str,
    inviter_user_id: str | None = None,
) -> str:
    """ARQ job: dispatch organization invitation email via verified org SMTP."""
    from app.worker.helpers.invite_task_helpers import execute_send_org_invite_email

    logger.info(f"[ARQ WORKER] Picked up send_org_invite_email_task for invite {invite_id}")
    return await execute_send_org_invite_email(invite_id, inviter_user_id)


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
        send_org_invite_email_task,
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
