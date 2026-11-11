"""ARQ worker configuration and task definitions for Prospectra.

Each worker task simply calls the predefined backend workflow functions (which update the
database directly so changes reflect in the frontend automatically) and marks the
job status in Redis as 'done' or 'not_done'.
"""

from __future__ import annotations

import signal
from typing import Any

from app.core.arq_config import (
    ARQ_JOB_TIMEOUT_SECONDS,
    ARQ_KEEP_RESULT_SECONDS,
    ARQ_MAX_JOBS,
    ARQ_QUEUE_NAME,
    get_redis_settings,
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
    `run_prospect_workflow` and updates the DB directly) and mark the job status in Redis.
    """
    from app.api.routes.company_search import _search_until_threshold

    job_id = str(ctx.get("job_id") or f"search-company-{org_id}")
    redis_conn = ctx.get("redis")

    await update_job_status(
        job_id=job_id,
        task_name="search_companies_arq_task",
        status="in_progress",
        redis_conn=redis_conn,
    )

    try:
        await _search_until_threshold(user_id, org_id, threshold)
        await update_job_status(
            job_id=job_id,
            task_name="search_companies_arq_task",
            status="done",
            redis_conn=redis_conn,
        )
        return "done"
    except Exception as exc:
        await update_job_status(
            job_id=job_id,
            task_name="search_companies_arq_task",
            status="not_done",
            error=str(exc),
            redis_conn=redis_conn,
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
    and mark the job status as 'done' or 'not_done' in Redis.
    """
    from app.api.routes.write_email import (
        format_write_email_response,
        revert_company_status_to_pending,
    )
    from app.langgraph.email_writer.graph import run_email_writer_workflow
    from app.langgraph.email_writer.tools.get_existing_email_tool import is_email_sent

    job_id = str(ctx.get("job_id") or f"write-email-{target_company_id}")
    redis_conn = ctx.get("redis")

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
            await update_job_status(
                job_id=job_id,
                task_name="write_email_arq_task",
                status="not_done",
                error="; ".join(response_data.get("errors") or ["Email generation failed"]),
                redis_conn=redis_conn,
            )
            return "not_done"

        await update_job_status(
            job_id=job_id,
            task_name="write_email_arq_task",
            status="done",
            redis_conn=redis_conn,
        )
        return "done"
    except Exception as exc:
        await revert_company_status_to_pending(target_company_id, org_id)
        await update_job_status(
            job_id=job_id,
            task_name="write_email_arq_task",
            status="not_done",
            error=str(exc),
            redis_conn=redis_conn,
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
