"""Helper functions for ARQ Redis settings, job status serialization, and webhook HTTP dispatch."""

from __future__ import annotations

import json
import os
from typing import Any

from arq.connections import RedisSettings
import httpx

from app.models.job_models import JobStatusRecord
from app.utils.constants.arq_constants import (
    BACKEND_INTERNAL_URL,
    DEFAULT_REDIS_DB,
    DEFAULT_REDIS_HOST,
    DEFAULT_REDIS_PORT,
    WEBHOOK_JOB_STATUS_PATH,
)
from app.utils.helpers.time_helpers import unix_now


def build_redis_settings_from_env() -> RedisSettings:
    """Build ARQ RedisSettings from environment variables."""
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        return RedisSettings.from_dsn(redis_url)

    host = os.getenv("REDIS_HOST", DEFAULT_REDIS_HOST)
    port = int(os.getenv("REDIS_PORT", str(DEFAULT_REDIS_PORT)))
    database = int(os.getenv("REDIS_DB", str(DEFAULT_REDIS_DB)))
    password = os.getenv("REDIS_PASSWORD") or None

    return RedisSettings(
        host=host,
        port=port,
        database=database,
        password=password,
        conn_timeout=10,
        conn_retries=5,
        conn_retry_delay=1,
    )


def serialize_job_status_record(
    job_id: str,
    task_name: str,
    status: str,
    error: str | None = None,
) -> str:
    """Serialize a JobStatusRecord dataclass to a JSON string."""
    record = JobStatusRecord(
        job_id=job_id,
        task_name=task_name,
        status=status,
        updated_at=unix_now(),
        error=error,
    )
    return json.dumps(record.to_dict(exclude_none=True))


def deserialize_job_status_record(raw_status: bytes | str) -> dict[str, Any]:
    """Deserialize a Redis job status value into a dictionary."""
    decoded = raw_status.decode("utf-8") if isinstance(raw_status, bytes) else raw_status
    return json.loads(decoded)


async def post_webhook_payload(payload: dict[str, Any]) -> None:
    """POST a job lifecycle webhook payload to the internal backend webhook endpoint."""
    url = f"{BACKEND_INTERNAL_URL.rstrip('/')}{WEBHOOK_JOB_STATUS_PATH}"
    async with httpx.AsyncClient(timeout=5.0) as client:
        await client.post(url, json=payload)
