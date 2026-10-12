"""Route: search companies until the organization's pending threshold is met."""

import os

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

from app.api.auth import authorize_org_member
from app.langgraph.company_finder.graph import run_prospect_workflow
from app.services.supabase import get_supabase_client

router = APIRouter()

ORGANIZATIONS_TABLE = os.environ.get("SUPABASE_ORGANIZATIONS_TABLE_NAME", "organizations")
COMPANIES_TABLE = os.environ.get("SUPABASE_COMPANIES_TABLE_NAME", "companies")
PENDING_STATUS = "pending_review"
MAX_STALLED_RUNS = 3


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
    return response.data["pending_threshold"]


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
    stalled = 0
    pending = await _count_pending(org_id)

    while pending < threshold and stalled < MAX_STALLED_RUNS:
        await run_prospect_workflow(user_id, org_id)
        new_pending = await _count_pending(org_id)
        stalled = stalled + 1 if new_pending <= pending else 0
        pending = new_pending


@router.post("/search-company")
async def search_company(body: SearchCompanyRequest, background_tasks: BackgroundTasks):
    user_id = await authorize_org_member(body.token, body.org_id)

    threshold = await _get_threshold(body.org_id)
    pending = await _count_pending(body.org_id)

    if pending >= threshold:
        return {"status": "threshold_met", "pending": pending, "threshold": threshold}

    background_tasks.add_task(_search_until_threshold, user_id, body.org_id, threshold)
    return {"status": "started", "pending": pending, "threshold": threshold}
