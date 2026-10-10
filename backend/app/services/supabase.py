"""Shared Supabase client factory."""

import os

from supabase import Client, create_client


def get_supabase_client() -> Client:
    """Create a Supabase client from the configured environment variables."""
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")

    if not url or not key:
        raise ValueError("Missing Supabase credentials")

    return create_client(url, key)
