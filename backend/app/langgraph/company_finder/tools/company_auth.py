"""LangGraph node for company authentication."""

import asyncio
import os
from typing import Any, Dict, List

from app.agents.company_authenticator.company_auth_agent import authenticate_company
from app.models.company import Company
from ..state.state import GraphState

COMPANY_AUTH_CONCURRENCY = int(os.environ.get("COMPANY_AUTH_CONCURRENCY", "5"))


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
        except Exception as e:
            return company.domain, None, f"Error authenticating {company.name} ({company.domain}): {str(e)}"


async def authenticate_companies_node(state: GraphState) -> Dict[str, Any]:
    """Node that scores verified companies against user profile and buyer suitability."""
    user_context = state.get("user_context")
    verified_companies = state.get("verified_companies", [])

    if not user_context:
        raise ValueError("user_context is missing from the state.")

    if not verified_companies:
        print("[PHASE 6: COMPANY AUTH LLM] No verified companies to authenticate.")
        return {"company_auth_scores": {}}

    print(f"\n========================================================")
    print(f"[PHASE 6: COMPANY AUTH LLM] Evaluating {len(verified_companies)} companies (concurrency: {COMPANY_AUTH_CONCURRENCY})...")
    print(f"========================================================")

    semaphore = asyncio.Semaphore(COMPANY_AUTH_CONCURRENCY)
    errors = list(state.get("errors", []))

    tasks = [
        auth_single_company(user_context, comp, semaphore)
        for comp in verified_companies
        if comp.domain
    ]
    results = await asyncio.gather(*tasks)

    company_auth_scores = {}
    for domain, score_obj, err in results:
        if err:
            errors.append(err)
            print(f"  [AUTH ERROR] {err}")
        if domain and score_obj:
            company_auth_scores[domain] = score_obj
            print(f"  [AUTH RESULT] {domain} -> Score: {score_obj.score}/100 (Corrected Name: '{score_obj.corrected_name or 'N/A'}')")
            print(f"    - Operating Business: {score_obj.is_real_operating_business}")
            print(f"    - Service Provider / Dev Shop: {score_obj.is_service_provider}")
            print(f"    - Has In-House Tech Team: {score_obj.has_in_house_tech_team}")
            print(f"    - Matched Industry: '{score_obj.matched_industry or 'None'}'")
            needed_skills = getattr(score_obj, "needed_skills", []) or getattr(score_obj, "user_skills", [])
            needed_services = getattr(score_obj, "needed_services", [])
            if needed_skills:
                print(f"    - Needed User Skills: {needed_skills}")
            if needed_services:
                print(f"    - Needed Services to Pitch: {needed_services}")
            print(f"    - Need Signals: {score_obj.need_signals}")
            if getattr(score_obj, "need_hypothesis", None):
                print(f"    - Need Hypothesis (Why Company Needs User): '{score_obj.need_hypothesis}'")
            print(f"    - Proposed Pitch: '{score_obj.proposed_solution}'")
            if score_obj.feedback:
                print(f"    - Low-Score Feedback: '{score_obj.feedback}'")

    print(f"[PHASE 6: COMPANY AUTH LLM] Scored {len(company_auth_scores)} companies.")

    return {
        "company_auth_scores": company_auth_scores,
        "errors": errors,
    }
