"""Helper functions for building Reacher request headers and parsing responses."""

from __future__ import annotations

from typing import Any, Dict

from app.utils.constants.prospecting_constants import REACHER_SECRET


def build_reacher_headers() -> Dict[str, str]:
    """Build HTTP headers for Reacher verification requests."""
    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if REACHER_SECRET:
        headers["x-reacher-secret"] = REACHER_SECRET
    return headers


def extract_reacher_fields(data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract normalized reachability and metadata flags from a Reacher JSON response."""
    smtp_info = data.get("smtp") or {}
    misc_info = data.get("misc") or {}
    mx_info = data.get("mx") or {}
    return {
        "is_reachable": data.get("is_reachable", "unknown"),
        "is_catch_all": smtp_info.get("is_catch_all"),
        "is_role_account": misc_info.get("is_role_account"),
        "is_disposable": misc_info.get("is_disposable"),
        "accepts_mail": mx_info.get("accepts_mail"),
    }
