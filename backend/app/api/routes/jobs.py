"""Webhook and WebSocket routes for pushing ARQ job lifecycle events ('started', 'done', 'failed') to the frontend without polling."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.core.arq_config import get_job_status

router = APIRouter()

# Connected frontend WebSocket clients indexed by org_id
_ORG_WEBHOOK_CLIENTS: dict[str, set[WebSocket]] = defaultdict(set)


class JobWebhookPayload(BaseModel):
    job_id: str
    task_name: str
    org_id: str
    status: str  # "started" | "done" | "failed" | "not_done"
    message: str
    company_id: str | None = None
    error: str | None = None
    timestamp: float | None = None


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


@router.post("/webhooks/job-status")
async def receive_job_webhook(body: JobWebhookPayload):
    """
    Webhook endpoint invoked by the ARQ worker (or job scheduler) when a job is
    scheduled ('started'), completed ('done'), or failed ('failed' / 'not_done').
    Immediately hooks the connected frontend client(s).
    """
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
    """
    Real-time webhook stream for the frontend app.
    Delivers 'started', 'done', and 'failed' job notifications for company search and email writing
    without any frontend polling or Google Play Services dependency.
    """
    await websocket.accept()
    _ORG_WEBHOOK_CLIENTS[org_id].add(websocket)
    try:
        while True:
            # Keep connection open; ignore client ping frames
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
