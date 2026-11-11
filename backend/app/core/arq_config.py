"""ARQ and Redis configuration, connection pool management, and job status tracking."""

from __future__ import annotations

import json
import os
import time
from typing import Any

from arq.connections import ArqRedis, RedisSettings, create_pool
from arq.jobs import Job, JobStatus

ARQ_QUEUE_NAME: str = os.getenv("ARQ_QUEUE_NAME", "prospectra:arq:queue")
ARQ_JOB_TIMEOUT_SECONDS: int = int(os.getenv("ARQ_JOB_TIMEOUT_SECONDS", "300"))
ARQ_KEEP_RESULT_SECONDS: int = int(os.getenv("ARQ_KEEP_RESULT_SECONDS", "86400"))  # 24h TTL in Redis
ARQ_MAX_JOBS: int = int(os.getenv("ARQ_MAX_JOBS", "10"))

JOB_STATUS_PREFIX = "prospectra:job:status:"

_arq_pool: ArqRedis | None = None


def get_redis_settings() -> RedisSettings:
    """Build ARQ RedisSettings from environment variables (matching docker-compose redis service)."""
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        return RedisSettings.from_dsn(redis_url)

    host = os.getenv("REDIS_HOST", "localhost")
    port = int(os.getenv("REDIS_PORT", "6379"))
    database = int(os.getenv("REDIS_DB", "0"))
    password = os.getenv("REDIS_PASSWORD") or None

    return RedisSettings(
        host=host,
        port=port,
        database=database,
        password=password,
        conn_timeout=3,
        conn_retries=1,
        conn_retry_delay=1,
    )


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
        print(f"[ARQ] Redis connection unavailable ({exc}).")
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
    """
    Mark a job's status in Redis ('queued', 'in_progress', 'done', 'not_done', 'failed').
    Does NOT store domain/email/company payloads in Redis — data updates go directly to the DB.
    """
    pool = redis_conn or await get_arq_pool()
    if pool is None:
        return
    try:
        record: dict[str, Any] = {
            "job_id": job_id,
            "task_name": task_name,
            "status": status,
            "updated_at": time.time(),
        }
        if error:
            record["error"] = error
        await pool.setex(
            f"{JOB_STATUS_PREFIX}{job_id}",
            ARQ_KEEP_RESULT_SECONDS,
            json.dumps(record),
        )
    except Exception as exc:
        print(f"[ARQ] Failed to update job status for {job_id}: {exc}")


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
            data = json.loads(raw_status.decode("utf-8") if isinstance(raw_status, bytes) else raw_status)
            return data
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
    """
    Enqueue a task onto the ARQ Redis queue and mark its status as 'queued' in Redis.
    Returns `job_id` if queued in Redis, or `None` if Redis is unreachable.
    """
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
        print(f"[ARQ] Enqueue error for {function_name}: {exc}")
        return None
