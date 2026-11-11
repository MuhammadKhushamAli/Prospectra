"""ARQ worker configuration and task definitions for Prospectra.

Each worker task calls the predefined backend workflow functions (which update the
database directly so changes reflect in the frontend automatically), marks the
job status in Redis as 'done' or 'not_done', and fires the job status webhook to notify the frontend.
"""

from __future__ import annotations

import asyncio
import signal
from typing import Any

from app.core.arq_config import (
    ARQ_JOB_TIMEOUT_SECONDS,
    ARQ_KEEP_RESULT_SECONDS,
    ARQ_MAX_JOBS,
    ARQ_QUEUE_NAME,
    get_redis_settings,
    trigger_job_webhook,
    update_job_status,
)

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
    print(f"[ARQ WORKER] Picked up job '{job_id}' -> search_companies_arq_task (org_id={org_id}, threshold={threshold})")

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
    print(f"[ARQ WORKER] Picked up job '{job_id}' -> write_email_arq_task (org_id={org_id}, company_id={target_company_id})")

    await update_job_status(
        job_id=job_id,
        task_name="write_email_arq_task",
        status="in_progress",
        redis_conn=redis_conn,
    )

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


async def on_worker_startup(ctx: dict[str, Any]) -> None:
    """Lifecycle hook executed when the ARQ worker starts."""
    print(f"[ARQ WORKER] Started listening on queue '{ARQ_QUEUE_NAME}'.")


async def on_worker_shutdown(ctx: dict[str, Any]) -> None:
    """Lifecycle hook executed when the ARQ worker shuts down."""
    print(f"[ARQ WORKER] Shutting down worker for queue '{ARQ_QUEUE_NAME}'.")


class WorkerSettings:
    """ARQ WorkerSettings class used by `arq app.worker.worker_config.WorkerSettings` and `backend/worker.py`."""

    functions = [
        search_companies_arq_task,
        write_email_arq_task,
    ]
    redis_settings = get_redis_settings()
    queue_name = ARQ_QUEUE_NAME
    job_timeout = ARQ_JOB_TIMEOUT_SECONDS
    keep_result = ARQ_KEEP_RESULT_SECONDS
    max_jobs = ARQ_MAX_JOBS
    on_startup = on_worker_startup
    on_shutdown = on_worker_shutdown
