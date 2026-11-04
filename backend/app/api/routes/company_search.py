import asyncio
import os
import time
from typing import Dict, Set

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.api.auth import authorize_org_member
from app.langgraph.company_finder.graph import run_prospect_workflow
from app.services.supabase import get_supabase_client

router = APIRouter()

ORGANIZATIONS_TABLE = os.environ.get("SUPABASE_ORGANIZATIONS_TABLE_NAME", "organizations")
COMPANIES_TABLE = os.environ.get("SUPABASE_COMPANIES_TABLE_NAME", "companies")
PENDING_STATUS = "pending_review"
MAX_STALLED_RUNS = 3
COOLDOWN_SECONDS = int(os.environ.get("SEARCH_COOLDOWN_SECONDS", "30"))

# In-memory tracking for anti-spam concurrency control
_SEARCH_LOCK = asyncio.Lock()
_ACTIVE_SEARCH_ORGS: Set[str] = set()
_LAST_SEARCH_TIMESTAMP: Dict[str, float] = {}


class SearchCompanyRequest(BaseModel):
    token: str
    org_id: str


async def _get_threshold(org_id: str) -> int:
    supabase = await get_supabase_client()
    response = await (
        supabase
        .table(ORGANIZATIONS_TABLE)
        .select("pending_threshold")
        .eq("id", org_id)
        .single()
        .execute()
    )
    return response.data.get("pending_threshold", 10) if response.data else 10


async def _count_pending(org_id: str) -> int:
    supabase = await get_supabase_client()
    response = await (
        supabase
        .table(COMPANIES_TABLE)
        .select("id", count="exact")
        .eq("org_id", org_id)
        .eq("status", PENDING_STATUS)
        .execute()
    )
    return response.count or 0


async def _search_until_threshold(user_id: str, org_id: str, threshold: int) -> None:
    """Run the company-finder graph until pending companies reach the threshold."""
    try:
        stalled = 0
        pending = await _count_pending(org_id)

        while pending < threshold and stalled < MAX_STALLED_RUNS:
            await run_prospect_workflow(user_id, org_id)
            new_pending = await _count_pending(org_id)
            stalled = stalled + 1 if new_pending <= pending else 0
            pending = new_pending
    except Exception as e:
        print(f"[COMPANY SEARCH BACKGROUND ERROR] Failed during workflow run: {str(e)}")
    finally:
        async with _SEARCH_LOCK:
            _ACTIVE_SEARCH_ORGS.discard(org_id)
            print(f"[COMPANY SEARCH] Released active search lock for org: {org_id}")


@router.get("/search-company/status")
async def get_search_status(org_id: str):
    """Check if a company search is currently running or within cooldown for an organization."""
    async with _SEARCH_LOCK:
        is_running = org_id in _ACTIVE_SEARCH_ORGS
        now = time.time()
        last_time = _LAST_SEARCH_TIMESTAMP.get(org_id, 0)
        cooldown_remaining = max(0, int(COOLDOWN_SECONDS - (now - last_time)))

    pending = await _count_pending(org_id)
    threshold = await _get_threshold(org_id)

    return {
        "is_running": is_running,
        "cooldown_remaining": cooldown_remaining,
        "pending": pending,
        "threshold": threshold,
    }


@router.post("/search-company")
async def search_company(body: SearchCompanyRequest, background_tasks: BackgroundTasks):
    """Initiate autonomous company finder with anti-spam concurrency and cooldown protections."""
    user_id = await authorize_org_member(body.token, body.org_id)

    now = time.time()
    async with _SEARCH_LOCK:
        # Check 1: Is a search already actively in-progress for this org?
        if body.org_id in _ACTIVE_SEARCH_ORGS:
            pending = await _count_pending(body.org_id)
            threshold = await _get_threshold(body.org_id)
            return {
                "status": "already_running",
                "message": "A company search is already in progress for this organization. Discovered prospects will appear shortly.",
                "pending": pending,
                "threshold": threshold,
            }

        # Check 2: Cooldown anti-spam protection (at least COOLDOWN_SECONDS between runs)
        last_time = _LAST_SEARCH_TIMESTAMP.get(body.org_id, 0)
        time_since_last = now - last_time
        if time_since_last < COOLDOWN_SECONDS:
            remaining = int(COOLDOWN_SECONDS - time_since_last)
            pending = await _count_pending(body.org_id)
            threshold = await _get_threshold(body.org_id)
            return {
                "status": "cooldown",
                "message": f"Search initiated recently. Please wait {remaining} second(s) before searching again.",
                "cooldown_remaining": remaining,
                "pending": pending,
                "threshold": threshold,
            }

        # Check 3: Is the pending prospect threshold already satisfied?
        threshold = await _get_threshold(body.org_id)
        pending = await _count_pending(body.org_id)
        if pending >= threshold:
            return {"status": "threshold_met", "pending": pending, "threshold": threshold}

        # Acquire lock and set timestamp
        _ACTIVE_SEARCH_ORGS.add(body.org_id)
        _LAST_SEARCH_TIMESTAMP[body.org_id] = now
        print(f"[COMPANY SEARCH] Acquired active search lock for org: {body.org_id}")

    background_tasks.add_task(_search_until_threshold, user_id, body.org_id, threshold)
    return {
        "status": "started",
        "message": "Company finder initiated successfully.",
        "pending": pending,
        "threshold": threshold,
        "cooldown_seconds": COOLDOWN_SECONDS,
    }

