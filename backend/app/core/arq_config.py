"""ARQ and Redis configuration, connection pool management, job status tracking, and webhook dispatch."""

from __future__ import annotations

from typing import Any

from arq.connections import ArqRedis, RedisSettings, create_pool
from arq.jobs import Job, JobStatus

from app.core.helpers.arq_helpers import (
    build_redis_settings_from_env,
    deserialize_job_status_record,
    post_webhook_payload,
    serialize_job_status_record,
)
from app.core.logging_config import get_node_logger
from app.models.job_models import JobWebhookPayload
from app.utils.constants.arq_constants import (
    ARQ_JOB_TIMEOUT_SECONDS,
    ARQ_KEEP_RESULT_SECONDS,
    ARQ_MAX_JOBS,
    ARQ_QUEUE_NAME,
    BACKEND_INTERNAL_URL,
    JOB_STATUS_PREFIX,
    WEBHOOK_JOB_STATUS_PATH,
)
from app.utils.helpers.time_helpers import unix_now

logger = get_node_logger("arq_worker")

_arq_pool: ArqRedis | None = None


def get_redis_settings() -> RedisSettings:
    """Build ARQ RedisSettings from environment variables."""
    return build_redis_settings_from_env()


async def get_arq_pool() -> ArqRedis | None:
    """Return a shared ArqRedis connection pool, or None if Redis is unreachable."""
    global _arq_pool
    if _arq_pool is not None:
        try:
            await _arq_pool.ping()
            return _arq_pool
        except Exception:
            _arq_pool = None

    try:
        _arq_pool = await create_pool(
            get_redis_settings(),
            default_queue_name=ARQ_QUEUE_NAME,
        )
        await _arq_pool.ping()
        return _arq_pool
    except Exception as exc:
        logger.error(f"[ARQ] Redis connection unavailable ({exc}).")
        _arq_pool = None
        return None


async def close_arq_pool() -> None:
    """Close the global ArqRedis connection pool on shutdown."""
    global _arq_pool
    if _arq_pool is not None:
        try:
            await _arq_pool.aclose()
        except Exception:
            pass
        _arq_pool = None


async def update_job_status(
    job_id: str,
    task_name: str,
    status: str,
    error: str | None = None,
    redis_conn: Any | None = None,
) -> None:
    """Mark a job's status in Redis ('queued', 'in_progress', 'done', 'not_done', 'failed')."""
    pool = redis_conn or await get_arq_pool()
    if pool is None:
        return
    try:
        await pool.setex(
            f"{JOB_STATUS_PREFIX}{job_id}",
            ARQ_KEEP_RESULT_SECONDS,
            serialize_job_status_record(job_id, task_name, status, error),
        )
    except Exception as exc:
        logger.error(f"[ARQ] Failed to update job status for {job_id}: {exc}")


async def trigger_job_webhook(
    job_id: str,
    task_name: str,
    org_id: str,
    status: str,
    message: str,
    company_id: str | None = None,
    email_id: str | None = None,
    reply_count: int | None = None,
    reply_from: str | None = None,
    reply_subject: str | None = None,
    reply_snippet: str | None = None,
    replied_at: str | None = None,
    replies: list[dict[str, Any]] | None = None,
    error: str | None = None,
) -> None:
    """Send a job lifecycle webhook event ('started', 'done', 'failed') to the backend webhook endpoint."""
    webhook = JobWebhookPayload(
        job_id=job_id,
        task_name=task_name,
        org_id=org_id,
        company_id=company_id,
        email_id=email_id,
        reply_count=reply_count,
        reply_from=reply_from,
        reply_subject=reply_subject,
        reply_snippet=reply_snippet,
        replied_at=replied_at,
        replies=replies,
        status=status,
        message=message,
        error=error,
        timestamp=unix_now(),
    )
    try:
        await post_webhook_payload(webhook.to_dict())
    except Exception as exc:
        logger.error(f"[ARQ WEBHOOK] Could not POST webhook for job {job_id}: {exc}")


async def get_job_status(job_id: str) -> dict[str, Any]:
    """Fetch an ARQ job's status ('queued', 'in_progress', 'done', 'not_done', 'failed') from Redis."""
    pool = await get_arq_pool()
    if pool is None:
        return {
            "job_id": job_id,
            "status": "redis_unavailable",
        }

    try:
        raw_status = await pool.get(f"{JOB_STATUS_PREFIX}{job_id}")
        if raw_status:
            return deserialize_job_status_record(raw_status)
    except Exception:
        pass

    job = Job(job_id=job_id, redis=pool, _queue_name=ARQ_QUEUE_NAME)
    try:
        arq_status = await job.status()
        status_str = arq_status.value if isinstance(arq_status, JobStatus) else str(arq_status)
        if status_str == JobStatus.complete.value:
            res = await job.result(timeout=1.0)
            status_str = res if isinstance(res, str) else "done"
    except Exception:
        status_str = "not_found"

    return {
        "job_id": job_id,
        "status": status_str,
    }


async def enqueue_arq_job(
    function_name: str,
    *args: Any,
    job_id: str | None = None,
    **kwargs: Any,
) -> str | None:
    """Enqueue a task onto the ARQ Redis queue and mark its status as 'queued' in Redis."""
    pool = await get_arq_pool()
    if pool is None:
        return None

    try:
        job = await pool.enqueue_job(
            function_name,
            *args,
            _job_id=job_id,
            _queue_name=ARQ_QUEUE_NAME,
            **kwargs,
        )
        effective_id = job.job_id if job is not None else job_id
        if not effective_id:
            return None

        await update_job_status(
            job_id=effective_id,
            task_name=function_name,
            status="queued",
            redis_conn=pool,
        )
        return effective_id
    except Exception as exc:
        logger.error(f"[ARQ] Enqueue error for {function_name}: {exc}")
        return None


__all__ = [
    "ARQ_JOB_TIMEOUT_SECONDS",
    "ARQ_KEEP_RESULT_SECONDS",
    "ARQ_MAX_JOBS",
    "ARQ_QUEUE_NAME",
    "BACKEND_INTERNAL_URL",
    "JOB_STATUS_PREFIX",
    "WEBHOOK_JOB_STATUS_PATH",
    "close_arq_pool",
    "enqueue_arq_job",
    "get_arq_pool",
    "get_job_status",
    "get_redis_settings",
    "trigger_job_webhook",
    "update_job_status",
]
