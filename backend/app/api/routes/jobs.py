"""API routes for inspecting ARQ job status ('queued', 'in_progress', 'done', 'not_done') in Redis."""

from fastapi import APIRouter, HTTPException

from app.core.arq_config import get_job_status

router = APIRouter()


@router.get("/jobs/{job_id}")
async def get_job_result(job_id: str):
    """Retrieve the current status ('queued', 'in_progress', 'done', 'not_done') of an ARQ job in Redis."""
    if not job_id or not job_id.strip():
        raise HTTPException(status_code=400, detail="job_id is required")

    job_info = await get_job_status(job_id.strip())
    if job_info.get("status") == "not_found":
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found in Redis")

    return job_info
