"""WebSocket client registry, webhook broadcast, and payload construction helpers for job events."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from fastapi import WebSocket

from app.models.job_models import JobWebhookPayload
from app.utils.helpers.time_helpers import unix_now

# Connected frontend WebSocket clients indexed by org_id
_ORG_WEBHOOK_CLIENTS: dict[str, set[WebSocket]] = defaultdict(set)


def build_started_webhook_payload(
    job_id: str,
    task_name: str,
    org_id: str,
    message: str,
    company_id: str | None = None,
    email_id: str | None = None,
) -> dict[str, Any]:
    """Construct a standard 'started' webhook payload dictionary via JobWebhookPayload."""
    payload = JobWebhookPayload(
        job_id=job_id,
        task_name=task_name,
        org_id=org_id,
        company_id=company_id,
        email_id=email_id,
        status="started",
        message=message,
        error=None,
        timestamp=unix_now(),
    )
    return payload.to_dict()


async def broadcast_job_webhook(payload: dict[str, Any]) -> int:
    """Push a job webhook event immediately to all connected frontend clients for `org_id`."""
    org_id = str(payload.get("org_id") or "")
    if not org_id:
        return 0

    clients = list(_ORG_WEBHOOK_CLIENTS.get(org_id, set()))
    delivered = 0
    stale: list[WebSocket] = []

    for ws in clients:
        try:
            await ws.send_json(payload)
            delivered += 1
        except Exception:
            stale.append(ws)

    for ws in stale:
        _ORG_WEBHOOK_CLIENTS[org_id].discard(ws)

    return delivered
