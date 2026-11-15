"""Helper functions for the company authentication LangGraph node."""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List

from app.agents.company_authenticator.company_auth_agent import authenticate_company
from app.core.logging_config import get_node_logger
from app.models.company import Company
from app.utils.constants.prospecting_constants import MIN_AUTH_SCORE

logger = get_node_logger("company_auth")


async def auth_single_company(
    user_context: Any,
    company: Company,
    semaphore: asyncio.Semaphore,
) -> tuple[str, Any, str | None]:
    """Score a single company with concurrency control."""
    async with semaphore:
        try:
            score_result = await authenticate_company(
                user_context=user_context,
                searched_company=company,
            )
            return company.domain, score_result, None
        except Exception as exc:
            return company.domain, None, f"Error authenticating {company.name} ({company.domain}): {str(exc)}"


def log_company_auth_result(domain: str, score_obj: Any) -> None:
    """No-op kept for helper export compatibility (detailed per-company logs replaced by batch counts)."""
    return None


def count_qualified_authenticated_companies(
    company_auth_scores: Dict[str, Any],
    target_industries: List[str],
) -> int:
    """Count how many authenticated companies meet the buyer qualification rules."""
    success_count = 0
    for score_obj in company_auth_scores.values():
        if score_obj and score_obj.score >= MIN_AUTH_SCORE and score_obj.is_real_operating_business:
            if not getattr(score_obj, "is_service_provider", False):
                if getattr(score_obj, "has_in_house_tech_team", "unknown") != "yes":
                    if not target_industries or getattr(score_obj, "matched_industry", None):
                        success_count += 1
    return success_count
