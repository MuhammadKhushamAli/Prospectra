"""Helper functions for buyer fit qualification, signal attachment, and search feedback synthesis."""

from __future__ import annotations

from typing import Any, Dict, List

from app.models.company import Company
from app.utils.helpers.state_helpers import extract_skill_names


def passes_buyer_criteria(auth_info: Any, target_industries: List[str]) -> bool:
    """Enforce strict buyer criteria: must NOT be a dev shop or have an in-house engineering team."""
    if not auth_info.is_real_operating_business:
        return False
    if getattr(auth_info, "is_service_provider", False):
        return False
    if getattr(auth_info, "has_in_house_tech_team", "unknown") == "yes":
        return False
    if target_industries and not getattr(auth_info, "matched_industry", None):
        return False
    return True


def apply_auth_signals_to_company(
    company: Company,
    auth_info: Any,
    verified_email_count: int,
) -> None:
    """Populate a Company instance and its raw_signals dict with LLM authentication results."""
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
    company.raw_signals["verified_email_count"] = verified_email_count

    if auth_info.corrected_name:
        company.name = auth_info.corrected_name


def build_iteration_search_feedback(
    pipeline_stats: Dict[str, Any],
    rejection_feedbacks: List[str],
) -> str:
    """Synthesize structured search feedback from pipeline stats and sample rejections."""
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

    return "\n\n".join(feedback_parts)


def build_reformation_search_feedback(
    user_context: Any,
    search_prompt: Any,
    success_rate: float,
    rejection_feedbacks: List[str],
) -> str:
    """Construct the reformation prompt when low acceptance rate repeats after page 0 retry."""
    skills_names = extract_skill_names(user_context)
    skills_str = ", ".join(skills_names) if skills_names else "Technical solutions"
    industries_str = (
        ", ".join(user_context.target_industries or [])
        if (user_context and getattr(user_context, "target_industries", None))
        else "Not specified"
    )

    if search_prompt and getattr(search_prompt, "searxng", None):
        queries = getattr(search_prompt.searxng, "queries", [])
        last_prompt_text = "\n".join(f"- Industry: {q.target_industry} | Query: {q.query}" for q in queries)
    elif search_prompt and hasattr(search_prompt, "model_dump_json"):
        last_prompt_text = search_prompt.model_dump_json(indent=2)
    else:
        last_prompt_text = str(search_prompt or "None")

    reformation_parts = [
        "=== REFORMATION PROMPT ===",
        f"Targeted Industry: {industries_str}",
        f"User Skill(s): {skills_str}",
        f"Status: The generated prompt is not providing unique companies now for skill(s) '{skills_str}' and targeted industry '{industries_str}'. "
        f"Low acceptance/success rate ({success_rate:.1%}) repeated even after resetting search progress to page 0.",
        "",
        "=== LAST GENERATED PROMPT (PREVIOUS QUERIES) ===",
        last_prompt_text,
        "",
        "=== MANDATE FOR REGENERATION ===",
        f"Formulate completely new, distinct search queries for {industries_str} and {skills_str}. "
        f"Pivot to alternative operational business niches, non-technical commercial workflows, or different search phrasing to discover unique, authentic companies without repeating the last queries above.",
    ]
    if rejection_feedbacks:
        reformation_parts.append("\nSample Rejection Reasons:\n" + "\n".join(f"- {r}" for r in rejection_feedbacks[:5]))

    return "\n".join(reformation_parts)
