"""LangGraph node for verifying company emails via self-hosted Reacher."""

import asyncio
import os
from typing import Any, Dict, List, Set

import httpx

from ..state.state import GraphState
from .scrape_companies import GUESS_GENERIC_EMAILS, build_assumed_company_emails
from app.core.logging_config import get_node_logger
from app.langgraph.company_finder.tools.store_search_progress import update_search_page_progress
from app.models.company import Company, CompanyEmail
from app.services.reacher import (
    ReacherResult,
    check_email_reacher,
    is_acceptable_email,
)

REACHER_CONCURRENCY = int(os.environ.get("REACHER_CONCURRENCY", "8"))
REACHER_TIMEOUT = float(os.environ.get("REACHER_TIMEOUT_SECONDS", "45"))
ACCEPT_RISKY = os.environ.get("REACHER_ACCEPT_RISKY", "false").lower() == "true"
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
                except Exception as e:
                    reacher_res = ReacherResult(
                        email=email_str,
                        is_reachable="unknown",
                        raw={"error": str(e)},
                    )
            email_cache[email_str] = reacher_res

        ce.is_reachable = reacher_res.is_reachable
        ce.is_role_account = reacher_res.is_role_account
        ce.is_catch_all = reacher_res.is_catch_all

        acceptable = is_acceptable_email(reacher_res, accept_risky=ACCEPT_RISKY)
        if acceptable:
            ce.is_verified = True
            verified.append(ce)
            verdict_str = "ACCEPTED (Reachable)"
        else:
            verdict_str = "DISCARDED (Unreachable or rejected)"

        logger.item(f"- Email: {email_str} [source: {ce.source}]")
        logger.item(f"  Reacher result -> is_reachable: '{reacher_res.is_reachable}', catch_all: {reacher_res.is_catch_all}, role_account: {reacher_res.is_role_account}, disposable: {reacher_res.is_disposable}")
        if acceptable:
            logger.success(f"      Verdict: {verdict_str}")
        else:
            logger.error(f"      Verdict: {verdict_str}")

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

    # Fall back to standard generic domain assumptions (e.g. contact@domain) in backend
    # if no scraped/existing email was verified as reachable, and test them with Reacher.
    if not verified_reachable_emails and GUESS_GENERIC_EMAILS and company.domain:
        assumed_emails = build_assumed_company_emails(
            company.domain,
            exclude_emails=checked_emails,
        )
        if assumed_emails:
            logger.info(f"  [EMAIL FALLBACK] {company.name} ({company.domain}) -> checking backend generic domain email assumption(s) via Reacher...")
            verified_reachable_emails = await _verify_email_candidates(
                client,
                assumed_emails,
                semaphore,
                email_cache,
                checked_emails,
            )

    # Filter to only keep verified reachable emails
    company.emails = verified_reachable_emails
    return company


async def verify_emails_node(state: GraphState) -> Dict[str, Any]:
    """Verify company emails via Reacher.

    MANDATORY RULE:
    - If a company does not have ANY reachable email, discard it.
    - If a company has at least one reachable email, retain it with verified emails.
    """
    scraped_companies = state.get("scraped_companies", [])
    if not scraped_companies:
        return {
            "verified_companies": [],
            "pipeline_stats": {
                "verified_companies_count": 0,
                "discarded_no_email_count": 0,
            },
        }

    logger.banner(f"[PHASE 5: REACHER EMAIL VERIFICATION] Checking emails for {len(scraped_companies)} companies (concurrency: {REACHER_CONCURRENCY})...")

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
                # If company has at least 1 reachable email, keep it!
                if len(res.emails) > 0:
                    verified_companies.append(res)
                    logger.success(f"  [REACHER KEPT] {res.name} ({res.domain}) -> {len(res.emails)} reachable email(s) verified.")
                else:
                    discarded_no_email_count += 1
                    logger.error(f"  [REACHER DISCARDED] {res.name} ({res.domain}) -> 0 reachable emails found. Discarding company.")
            else:
                discarded_no_email_count += 1
                logger.error(f"  [REACHER ERROR] Exception checking company: {str(res)}")

        # Check if all Reacher calls returned unknown (port 25 blocked heuristic)
        for r_res in email_cache.values():
            if r_res.is_reachable == "unknown":
                unknown_count += 1

        if total_checked_count > 0 and unknown_count == len(email_cache) and len(email_cache) > 0:
            warning_msg = (
                "Reacher email verification warning: All verified emails returned 'unknown'. "
                "Outbound TCP port 25 may be blocked by your ISP or hosting provider."
            )
            logger.warning(f"  [WARNING] {warning_msg}")
            if warning_msg not in errors:
                errors.append(warning_msg)

    logger.header(f"[PHASE 5: REACHER] Summary: {len(verified_companies)} companies kept (with >=1 reachable email), {discarded_no_email_count} discarded.")

    if not verified_companies:
        logger.info("[PHASE 5: REACHER] 0 verified reachable emails. Updating search progress in DB (resetting to page 1)...")
        await update_search_page_progress(state, success_count=0)

    return {
        "verified_companies": verified_companies,
        "errors": errors,
        "pipeline_stats": {
            "verified_companies_count": len(verified_companies),
            "discarded_no_email_count": discarded_no_email_count,
        },
    }
