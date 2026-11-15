"""ARQ worker, Redis queue, and webhook constants."""

from __future__ import annotations

import os

ARQ_QUEUE_NAME: str = os.getenv("ARQ_QUEUE_NAME", "prospectra:arq:queue")
ARQ_JOB_TIMEOUT_SECONDS: int = int(os.getenv("ARQ_JOB_TIMEOUT_SECONDS", "1800"))
ARQ_KEEP_RESULT_SECONDS: int = int(os.getenv("ARQ_KEEP_RESULT_SECONDS", "86400"))
ARQ_MAX_JOBS: int = int(os.getenv("ARQ_MAX_JOBS", "10"))

BACKEND_INTERNAL_URL: str = os.getenv("BACKEND_INTERNAL_URL", "http://127.0.0.1:8000")
WEBHOOK_JOB_STATUS_PATH: str = "/api/v1/webhooks/job-status"
JOB_STATUS_PREFIX: str = "prospectra:job:status:"

DEFAULT_REDIS_HOST: str = "127.0.0.1"
DEFAULT_REDIS_PORT: int = 6379
DEFAULT_REDIS_DB: int = 0
