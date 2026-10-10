"""Helper function for storing search progress to Supabase in the background."""

from dataclasses import asdict
from typing import List
from tenacity import retry, stop_after_attempt, wait_exponential

from app.models.search_progress import SearchProgress
from app.services.supabase import get_supabase_client


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def store_search_progress(search_progress: List[SearchProgress]) -> None:
    """Store the search progress for Apollo and Tavily to the database."""
    if not search_progress:
        return
    
    try:
        supabase = get_supabase_client()
        
        records = [asdict(progress) for progress in search_progress]
        
        # We need to convert the datetime to ISO format string for Supabase
        for record in records:
            if record.get("last_fetched_at"):
                record["last_fetched_at"] = record["last_fetched_at"].isoformat()
            
        if records:
            supabase.table("search_progress").upsert(records).execute()
            
    except Exception as e:
        print(f"Failed to store search progress to Supabase: {str(e)}")
        raise e
