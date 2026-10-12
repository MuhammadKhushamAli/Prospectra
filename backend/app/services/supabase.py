"""Shared async Supabase client factory."""

import asyncio
import os
from typing import Optional

from supabase import AsyncClient, acreate_client

_client: Optional[AsyncClient] = None
_lock = asyncio.Lock()


async def get_supabase_client() -> AsyncClient:
    """Return a cached async Supabase client built from environment variables."""
    global _client
    if _client is not None:
        return _client

    async with _lock:
        if _client is None:
            url = os.environ.get("SUPABASE_URL", "")
            key = os.environ.get("SUPABASE_KEY", "")

            if not url or not key:
                raise ValueError("Missing Supabase credentials")

            _client = await acreate_client(url, key)

    return _client
