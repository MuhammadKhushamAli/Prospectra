"""LangGraph node for filtering companies based on authentication scores and buyer rules."""

import os
from typing import Any, Dict, List

from app.core.logging_config import get_node_logger
from ..state.state import GraphState
from app.models.company import Company

MIN_AUTH_SCORE = int(os.environ.get("COMPANY_AUTH_MIN_SCORE", "70"))
MAX_ACCEPTED_PER_RUN = int(os.environ.get("MAX_ACCEPTED_PER_RUN", "10"))
logger = get_node_logger("filter_companies")


def passes_buyer_criteria(auth_info: Any, target_industries: List[str]) -> bool:
    """Enforce strict buyer criteria: must NOT be a dev shop or have an in-house engineering team."""
    if not auth_info.is_real_operating_business:
        return False

    # Disqualify agencies, dev shops, and software service providers
    if getattr(auth_info, "is_service_provider", False):
        return False

    # Disqualify companies confirmed to have in-house engineering teams
    if getattr(auth_info, "has_in_house_tech_team", "unknown") == "yes":
        return False

    # If target industries are explicitly specified, require industry alignment
    if target_industries and not getattr(auth_info, "matched_industry", None):
        return False

    return True


async def filter_companies_node(state: GraphState) -> Dict[str, Any]:
    """Filter authenticated companies into accepted prospects and build feedback for regeneration."""
    verified_companies = state.get("verified_companies", [])
    company_auth_scores = state.get("company_auth_scores", {})
    target_industries = state.get("target_industries", [])
    pipeline_stats = state.get("pipeline_stats", {})

    accepted_companies: List[Company] = []
    rejected_companies: List[Company] = []
    rejection_feedbacks: List[str] = []

    logger.banner(f"[PHASE 7: BUYER FIT & RANKING] Filtering {len(verified_companies)} companies (min_score: {MIN_AUTH_SCORE}, max_accepted: {MAX_ACCEPTED_PER_RUN})...")

    for company in verified_companies:
        if not company.domain:
            continue

        verified_emails = [ce for ce in (company.emails or []) if ce.is_verified]
        if not verified_emails:
            rejected_companies.append(company)
            rejection_feedbacks.append(
                f"{company.name} ({company.domain}): No Reacher-verified reachable email"
            )
            logger.error(
                f"  [REJECTED] {company.name} ({company.domain}) -> "
                f"0 Reacher-verified reachable emails."
            )
            continue

        auth_info = company_auth_scores.get(company.domain)
        if not auth_info:
            continue

        if not isinstance(company.raw_signals, dict):
            company.raw_signals = {}

        needed_skills = getattr(auth_info, "needed_skills", []) or getattr(auth_info, "user_skills", [])
        needed_services = getattr(auth_info, "needed_services", [])
        need_signals = getattr(auth_info, "need_signals", [])
        need_hypothesis = getattr(auth_info, "need_hypothesis", "")
        proposed_solution = getattr(auth_info, "proposed_solution", "")
        services_offered = company.scraped.services_offered if company.scraped else []
        digital_features = company.scraped.digital_features if company.scraped else []
        about_text = company.scraped.about_text if company.scraped else ""

        # Set dedicated fields directly on Company model
        company.about_text = about_text
        company.need_hypothesis = need_hypothesis
        company.needed_skills = needed_skills
        company.needed_services = needed_services
        company.need_signals = need_signals
        company.proposed_solution = proposed_solution
        company.services_offered = services_offered
        company.digital_features = digital_features
        company.auth_score = auth_info.score
        company.auth_feedback = auth_info.feedback

        # Also preserve in raw_signals for full auditability
        company.raw_signals["auth_score"] = auth_info.score
        company.raw_signals["auth_feedback"] = auth_info.feedback
        company.raw_signals["is_service_provider"] = getattr(auth_info, "is_service_provider", False)
        company.raw_signals["has_in_house_tech_team"] = getattr(auth_info, "has_in_house_tech_team", "unknown")
        company.raw_signals["need_signals"] = need_signals
        company.raw_signals["need_hypothesis"] = need_hypothesis
        company.raw_signals["proposed_solution"] = proposed_solution
        company.raw_signals["needed_skills"] = needed_skills
        company.raw_signals["needed_services"] = needed_services
        company.raw_signals["user_skills"] = needed_skills
        company.raw_signals["services_offered"] = services_offered
        company.raw_signals["digital_features"] = digital_features
        company.raw_signals["target_industries"] = auth_info.target_industries
        company.raw_signals["verified_email_count"] = len(verified_emails)

        if auth_info.corrected_name:
            company.name = auth_info.corrected_name

        qualifies_as_buyer = passes_buyer_criteria(auth_info, target_industries)

        if qualifies_as_buyer and auth_info.score >= MIN_AUTH_SCORE:
            accepted_companies.append(company)
            logger.success(f"  [ACCEPTED] {company.name} ({company.domain})")
            logger.info(f"    Score: {auth_info.score}/100 | Reachable emails: {len(verified_emails)}")
            logger.info(f"    Needed skills: {needed_skills}")
            logger.info(f"    Needed services: {needed_services}")
            logger.info(f"    Need signals: {auth_info.need_signals}")
            if getattr(auth_info, "need_hypothesis", None):
                logger.info(f"    Need hypothesis: {auth_info.need_hypothesis}")
            logger.info(f"    Proposed pitch: {auth_info.proposed_solution}")
        else:
            rejected_companies.append(company)
            reason = auth_info.feedback or "Failed buyer qualification (service provider or has dev workforce)"
            rejection_feedbacks.append(f"{company.name} ({company.domain}): {reason}")
            logger.error(f"  [REJECTED] {company.name} ({company.domain})")
            logger.error(f"    Score: {auth_info.score}/100 | Reason: {reason}")

    # Rank accepted companies by (score, email_count) descending
    accepted_companies.sort(
        key=lambda c: (
            company_auth_scores.get(c.domain).score if c.domain in company_auth_scores else 0,
            len(c.emails),
        ),
        reverse=True,
    )
    accepted_companies = accepted_companies[:MAX_ACCEPTED_PER_RUN]

    logger.header(f"\n[PHASE 7: BUYER FIT & RANKING] Summary:")
    logger.info(f"  Total accepted: {len(accepted_companies)}")
    logger.info(f"  Total rejected: {len(rejected_companies)}")

    # Synthesize structured search feedback for the prompt generator
    feedback_parts: List[str] = []
    if pipeline_stats:
        feedback_parts.append(
            f"Pipeline Stats: Searched {pipeline_stats.get('searched', 0)}, "
            f"Blocked {pipeline_stats.get('blocked', 0)}, "
            f"Prefilter Dropped {pipeline_stats.get('prefilter_dropped', 0)}, "
            f"Discarded No Reachable Email {pipeline_stats.get('discarded_no_email_count', 0)}."
        )

    if rejection_feedbacks:
        sample_rejections = rejection_feedbacks[:5]
        feedback_parts.append("Sample Rejections:\n" + "\n".join(f"- {r}" for r in sample_rejections))
        feedback_parts.append(
            "MANDATE FOR NEXT ITERATION: Shift search terms toward non-technical business operators. "
            "Avoid queries that match agencies, aggregators, or tech consulting firms."
        )

    search_feedback = "\n\n".join(feedback_parts)

    return {
        "accepted_companies": accepted_companies,
        "rejected_companies": rejected_companies,
        "search_feedback": search_feedback,
    }
