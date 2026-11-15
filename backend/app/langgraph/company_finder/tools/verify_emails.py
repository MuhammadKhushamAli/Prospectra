"""LangGraph node for verifying company emails via self-hosted Reacher."""

import asyncio
from typing import Any, Dict, List

import httpx

from app.core.logging_config import get_node_logger
from app.langgraph.company_finder.state.state import GraphState
from app.langgraph.company_finder.tools.helpers.scrape_node_helpers import (
    build_assumed_company_emails,
)
from app.langgraph.company_finder.tools.helpers.verify_emails_helpers import (
    _verify_email_candidates,
    verify_single_company_emails,
)
from app.langgraph.company_finder.tools.store_search_progress import update_search_page_progress
from app.models.company import Company
from app.services.reacher import ReacherResult
from app.utils.constants.prospecting_constants import (
    ACCEPT_RISKY,
    GUESS_GENERIC_EMAILS,
    REACHER_CONCURRENCY,
    REACHER_TIMEOUT,
)

logger = get_node_logger("verify_emails")


async def verify_emails_node(state: GraphState) -> Dict[str, Any]:
    """Verify company emails via Reacher, retaining only companies with at least one reachable email."""
    scraped_companies = state.get("scraped_companies", [])
    if not scraped_companies:
        return {
            "verified_companies": [],
            "pipeline_stats": {
                "verified_companies_count": 0,
                "discarded_no_email_count": 0,
            },
        }

    semaphore = asyncio.Semaphore(REACHER_CONCURRENCY)
    email_cache: Dict[str, ReacherResult] = {}
    verified_companies: List[Company] = []
    discarded_no_email_count = 0
    errors = list(state.get("errors", []))

    async with httpx.AsyncClient() as http_client:
        tasks = [
            verify_single_company_emails(http_client, comp, semaphore, email_cache)
            for comp in scraped_companies
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        total_checked_count = 0
        unknown_count = 0

        for res in results:
            if isinstance(res, Company):
                total_checked_count += 1
                if len(res.emails) > 0:
                    verified_companies.append(res)
                else:
                    discarded_no_email_count += 1
            else:
                discarded_no_email_count += 1

        for r_res in email_cache.values():
            if r_res.is_reachable == "unknown":
                unknown_count += 1

        if total_checked_count > 0 and unknown_count == len(email_cache) and len(email_cache) > 0:
            warning_msg = (
                "Reacher email verification warning: All verified emails returned 'unknown'. "
                "Outbound TCP port 25 may be blocked by your ISP or hosting provider."
            )
            logger.warning(f"[EMAIL VERIFICATION] {warning_msg}")
            if warning_msg not in errors:
                errors.append(warning_msg)

    total_reachable_emails = sum(len(c.emails or []) for c in verified_companies)
    logger.info(
        f"[EMAIL VERIFICATION] Verified {len(verified_companies)}/{len(scraped_companies)} companies "
        f"with {total_reachable_emails} reachable email(s) ({discarded_no_email_count} discarded, "
        f"{len(email_cache)} unique emails checked)."
    )

    if not verified_companies:
        await update_search_page_progress(state, success_count=0)

    return {
        "verified_companies": verified_companies,
        "errors": errors,
        "pipeline_stats": {
            "verified_companies_count": len(verified_companies),
            "discarded_no_email_count": discarded_no_email_count,
        },
    }


__all__ = [
    "REACHER_CONCURRENCY",
    "REACHER_TIMEOUT",
    "ACCEPT_RISKY",
    "GUESS_GENERIC_EMAILS",
    "build_assumed_company_emails",
    "_verify_email_candidates",
    "verify_single_company_emails",
    "verify_emails_node",
]
