"""LangGraph node for filtering companies based on authentication scores and buyer rules."""

from typing import Any, Dict, List

from app.core.logging_config import get_node_logger
from app.langgraph.company_finder.state.state import GraphState
from app.langgraph.company_finder.tools.helpers.filter_companies_helpers import (
    apply_auth_signals_to_company,
    build_iteration_search_feedback,
    build_reformation_search_feedback,
    passes_buyer_criteria,
)
from app.langgraph.company_finder.tools.store_search_progress import (
    force_reset_search_page_to_zero,
    update_search_page_progress,
)
from app.models.company import Company
from app.utils.constants.prospecting_constants import (
    MAX_ACCEPTED_PER_RUN,
    MIN_AUTH_SCORE,
    MIN_SEARCH_ACCEPT_RATE,
)

logger = get_node_logger("filter_companies")


async def filter_companies_node(state: GraphState) -> Dict[str, Any]:
    """Filter authenticated companies into accepted prospects and build feedback for regeneration."""
    verified_companies = state.get("verified_companies", [])
    company_auth_scores = state.get("company_auth_scores", {})
    user_context = state.get("user_context")
    target_industries = (
        (getattr(user_context, "target_industries", None) or [])
        if user_context
        else (state.get("target_industries") or [])
    )
    pipeline_stats = state.get("pipeline_stats", {})

    accepted_companies: List[Company] = []
    rejected_companies: List[Company] = []
    rejection_feedbacks: List[str] = []

    for company in verified_companies:
        if not company.domain:
            continue

        verified_emails = [ce for ce in (company.emails or []) if ce.is_verified]
        if not verified_emails:
            rejected_companies.append(company)
            rejection_feedbacks.append(
                f"{company.name} ({company.domain}): No Reacher-verified reachable email"
            )
            continue

        auth_info = company_auth_scores.get(company.domain)
        if not auth_info:
            continue

        apply_auth_signals_to_company(company, auth_info, len(verified_emails))
        qualifies_as_buyer = passes_buyer_criteria(auth_info, target_industries)

        if qualifies_as_buyer and auth_info.score >= MIN_AUTH_SCORE:
            accepted_companies.append(company)
        else:
            rejected_companies.append(company)
            reason = auth_info.feedback or "Failed buyer qualification (service provider or has dev workforce)"
            rejection_feedbacks.append(f"{company.name} ({company.domain}): {reason}")

    accepted_companies.sort(
        key=lambda c: (
            company_auth_scores.get(c.domain).score if c.domain in company_auth_scores else 0,
            len(c.emails),
        ),
        reverse=True,
    )
    accepted_companies = accepted_companies[:MAX_ACCEPTED_PER_RUN]

    logger.info(
        f"[FILTER COMPANIES] Filtered {len(verified_companies)} companies: "
        f"{len(accepted_companies)} accepted, {len(rejected_companies)} rejected."
    )

    search_feedback = build_iteration_search_feedback(pipeline_stats, rejection_feedbacks)

    if not pipeline_stats.get("progress_updated_in_db"):
        await update_search_page_progress(state, success_count=len(accepted_companies))

    success_rate = pipeline_stats.get("success_rate", 0.0)
    has_low_rate = (len(accepted_companies) == 0) or (success_rate < MIN_SEARCH_ACCEPT_RATE)

    same_prompt_retries = state.get("same_prompt_retries", 0)
    same_prompt_retry_active = False

    if has_low_rate:
        if same_prompt_retries == 0:
            same_prompt_retry_active = True
            same_prompt_retries = 1
            logger.info(
                f"[FILTER COMPANIES] Success rate {success_rate:.1%} < {MIN_SEARCH_ACCEPT_RATE:.0%}: "
                f"resetting search page to 0 for retry with same prompt."
            )
            await force_reset_search_page_to_zero(state)
            search_feedback = state.get("search_feedback", "")
        else:
            same_prompt_retry_active = False
            same_prompt_retries = 0
            logger.info(
                f"[FILTER COMPANIES] Success rate {success_rate:.1%} repeated after page 0 retry: "
                f"triggering prompt reformation."
            )
            search_feedback = build_reformation_search_feedback(
                user_context=user_context,
                search_prompt=state.get("search_prompt"),
                success_rate=success_rate,
                rejection_feedbacks=rejection_feedbacks,
            )

    return {
        "accepted_companies": accepted_companies,
        "rejected_companies": rejected_companies,
        "search_feedback": search_feedback,
        "same_prompt_retries": same_prompt_retries,
        "same_prompt_retry_active": same_prompt_retry_active,
    }


__all__ = [
    "MIN_AUTH_SCORE",
    "MAX_ACCEPTED_PER_RUN",
    "passes_buyer_criteria",
    "filter_companies_node",
]
