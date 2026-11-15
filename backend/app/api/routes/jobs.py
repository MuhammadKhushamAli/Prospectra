"""Webhook and WebSocket routes for pushing ARQ job lifecycle events ('started', 'done', 'failed') to the frontend."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.api.routes.helpers.jobs_helpers import (
    _ORG_WEBHOOK_CLIENTS,
    broadcast_job_webhook,
)
from app.core.arq_config import get_job_status

router = APIRouter()


class JobWebhookPayload(BaseModel):
    job_id: str
    task_name: str
    org_id: str
    status: str  # "started" | "done" | "failed" | "not_done"
    message: str
    company_id: str | None = None
    email_id: str | None = None
    reply_count: int | None = None
    reply_from: str | None = None
    reply_subject: str | None = None
    reply_snippet: str | None = None
    replied_at: str | None = None
    replies: list[dict[str, Any]] | None = None
    error: str | None = None
    timestamp: float | None = None


@router.post("/webhooks/job-status")
async def receive_job_webhook(body: JobWebhookPayload):
    """Webhook endpoint invoked by the ARQ worker when a job changes status."""
    payload = body.model_dump()
    delivered = await broadcast_job_webhook(payload)
    return {
        "status": "hooked",
        "delivered_clients": delivered,
        "job_id": body.job_id,
        "job_status": body.status,
    }


@router.websocket("/ws/webhooks/{org_id}")
async def frontend_webhook_socket(websocket: WebSocket, org_id: str):
    """Real-time webhook stream for the frontend app."""
    await websocket.accept()
    _ORG_WEBHOOK_CLIENTS[org_id].add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        _ORG_WEBHOOK_CLIENTS[org_id].discard(websocket)


@router.get("/jobs/{job_id}")
async def get_job_result(job_id: str):
    """Retrieve the current status ('queued', 'in_progress', 'done', 'not_done') of an ARQ job in Redis."""
    if not job_id or not job_id.strip():
        raise HTTPException(status_code=400, detail="job_id is required")

    job_info = await get_job_status(job_id.strip())
    if job_info.get("status") == "not_found":
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found in Redis")

    return job_info


__all__ = [
    "JobWebhookPayload",
    "_ORG_WEBHOOK_CLIENTS",
    "broadcast_job_webhook",
    "frontend_webhook_socket",
    "get_job_result",
    "receive_job_webhook",
    "router",
]
