"""Helper functions for verifying company emails with Reacher and fallback domain assumptions."""

from __future__ import annotations

import asyncio
from typing import Dict, List, Set

import httpx

from app.core.logging_config import get_node_logger
from app.langgraph.company_finder.tools.helpers.scrape_node_helpers import (
    build_assumed_company_emails,
)
from app.models.company import Company, CompanyEmail
from app.services.reacher import (
    ReacherResult,
    check_email_reacher,
    is_acceptable_email,
)
from app.utils.constants.prospecting_constants import (
    ACCEPT_RISKY,
    GUESS_GENERIC_EMAILS,
    REACHER_TIMEOUT,
)

logger = get_node_logger("verify_emails")


async def _verify_email_candidates(
    client: httpx.AsyncClient,
    candidates: List[CompanyEmail],
    semaphore: asyncio.Semaphore,
    email_cache: Dict[str, ReacherResult],
    checked_emails: Set[str],
) -> List[CompanyEmail]:
    """Verify candidate emails with Reacher, returning only reachable ones."""
    verified: List[CompanyEmail] = []

    for ce in candidates:
        email_str = ce.email.strip().lower()
        if not email_str or email_str in checked_emails:
            continue
        checked_emails.add(email_str)

        if email_str in email_cache:
            reacher_res = email_cache[email_str]
        else:
            async with semaphore:
                try:
                    reacher_res = await check_email_reacher(
                        client,
                        email_str,
                        timeout=REACHER_TIMEOUT,
                    )
                except Exception as exc:
                    reacher_res = ReacherResult(
                        email=email_str,
                        is_reachable="unknown",
                        raw={"error": str(exc)},
                    )
            email_cache[email_str] = reacher_res

        ce.is_reachable = reacher_res.is_reachable
        ce.is_role_account = reacher_res.is_role_account
        ce.is_catch_all = reacher_res.is_catch_all

        if is_acceptable_email(reacher_res, accept_risky=ACCEPT_RISKY):
            ce.is_verified = True
            verified.append(ce)

    return verified


async def verify_single_company_emails(
    client: httpx.AsyncClient,
    company: Company,
    semaphore: asyncio.Semaphore,
    email_cache: Dict[str, ReacherResult],
) -> Company:
    """Verify company emails via Reacher, falling back to generic domain assumptions if none reach."""
    checked_emails: Set[str] = set()
    verified_reachable_emails = await _verify_email_candidates(
        client,
        company.emails,
        semaphore,
        email_cache,
        checked_emails,
    )

    if not verified_reachable_emails and GUESS_GENERIC_EMAILS and company.domain:
        assumed_emails = build_assumed_company_emails(
            company.domain,
            exclude_emails=checked_emails,
        )
        if assumed_emails:
            verified_reachable_emails = await _verify_email_candidates(
                client,
                assumed_emails,
                semaphore,
                email_cache,
                checked_emails,
            )

    company.emails = verified_reachable_emails
    return company
