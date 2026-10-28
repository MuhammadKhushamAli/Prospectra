"""Company-authentication agent.

Evaluates candidate companies based on scraped website data, user skills, and target industries.
Determines whether a company is an authentic client prospect that lacks an in-house tech workforce.
"""

import json
import os
from typing import Any, Dict, List

from openai import AsyncOpenAI

from app.core.llms.open_ai_llm import parse_structured_response
from app.models.company import Company
from app.models.user_context import UserContext
from .pydantic_model.company_auth import CompanyAuth

SYSTEM_PROMPT = """
You are Prospectra's company-authentication agent.

Your mission is to evaluate whether a candidate company is a high-converting CLIENT PROSPECT to whom we can pitch the user's technical skills and software solutions.

THE CORE QUESTION YOU MUST ANSWER:
"Would this business BUY a solution built with the user's skills, or does it ALREADY SELL or EMPLOY those skills in-house?"

EVALUATION & SCORING RULES:

1. HIGHEST SCORING TIER (80 - 100) - IDEAL CLIENT PROSPECTS:
   - Operating businesses in the user's target industries (e.g., healthcare clinics, dental groups, logistics firms, real estate agencies, retail brands, law offices, manufacturing).
   - Core business is NOT tech or software development.
   - THEY DO NOT HAVE AN IN-HOUSE DEV WORKFORCE: They rely on external specialists/consultants to build and maintain their software, mobile apps, customer portals, or automation.
   - Must provide concrete `need_signals` observed from their profile and a concise `proposed_solution`.

2. PENALIZE & HARD REJECT (Score 0 - 35) - WRONG TARGET (ALREADY HAS THIS WORKFORCE):
   - Software development agencies, web design shops, IT consultancies, dev shops, or SaaS vendors selling tech tools.
   - If `is_service_provider` is true: SCORE MUST BE <= 30.
   - If `has_in_house_tech_team` is "yes": SCORE MUST BE <= 45.
   - Feedback is mandatory explaining: "Company is a dev shop / agency that already has an in-house workforce."

3. IMMEDIATE ZERO (Score 0) - NON-COMPANIES:
   - Directories, listicles, review aggregators, job boards, or generic portals.
   - Set `is_real_operating_business = false` and score = 0.

4. TARGET INDUSTRY ALIGNMENT:
   - If target industries are specified, verify if the company operates within or directly serves one of them. If not, score must not exceed 40.

5. NEED HYPOTHESIS & SKILLS CONCLUSION (MANDATORY AFTER READING COMPANY DATA):
   - After carefully analyzing the scraped website profile, services, and digital features, you MUST formulate:
     a) `need_hypothesis`: A clear, reasoned conclusion explaining WHY this company needs the user's technical skills and services based on the actual scraped company data (e.g. "Austin Dental relies on phone calls and static web pages for appointments; they need the user's web/mobile development skills to automate patient intake and online scheduling").
     b) `needed_skills`: Which specific skills from the user's skill set does this company need? (Match directly against user_skills, e.g. React, Python, Mobile App Development, FastAPI, Automation).
     c) `needed_services`: Which specific digital services or software solutions does this business need to scale or modernize? (e.g. "Online Patient Booking & Intake System", "Custom Client Portal", "Mobile App for Scheduling", "Automated Billing & Invoicing").
     d) `need_signals`: Concrete evidence observed from the scraped profile, services, and digital features (e.g. "Website lacks online booking", "No mobile app", "Uses WordPress with static contact forms").
     e) `proposed_solution`: A concise 1-2 sentence pitch proposing the needed services built with the user's skills.
"""


async def authenticate_company(
    user_context: UserContext,
    searched_company: Company,
) -> CompanyAuth:
    """Score and authenticate a candidate company for buyer fit."""
    skills_list: List[str] = [
        s.name if hasattr(s, "name") else str(s)
        for s in (user_context.skills or [])
    ]
    target_industries: List[str] = [
        str(o).strip()
        for o in (user_context.target_industries or [])
        if str(o).strip()
    ]

    scraped = searched_company.scraped
    about_text = scraped.about_text if scraped else ""
    meta_desc = scraped.meta_description if scraped else ""
    title = scraped.title if scraped else searched_company.name
    services_offered = scraped.services_offered if scraped else []
    digital_features = scraped.digital_features if scraped else []
    verified_email_count = len(searched_company.emails)

    candidate_summary: Dict[str, Any] = {
        "company_name": searched_company.name,
        "domain": searched_company.domain,
        "website": searched_company.website,
        "page_title": title,
        "meta_description": meta_desc,
        "search_snippet": searched_company.search_snippet,
        "scraped_about_text": about_text[:1800],
        "scraped_services_offered": services_offered,
        "scraped_digital_features": digital_features,
        "verified_reachable_emails_count": verified_email_count,
    }

    user_summary: Dict[str, Any] = {
        "user_name": user_context.full_name,
        "user_skills": skills_list,
        "target_industries": target_industries,
    }

    user_input = (
        f"=== USER CONTEXT (SKILLS & TARGET INDUSTRIES) ===\n"
        f"{json.dumps(user_summary, indent=2)}\n\n"
        f"=== CANDIDATE COMPANY PROFILE ===\n"
        f"{json.dumps(candidate_summary, indent=2)}\n\n"
        f"Evaluate this candidate company strictly according to the scoring rules."
    )

    client = AsyncOpenAI(
        api_key=os.getenv("COMPANY_AUTH_API_KEY", os.getenv("OPENAI_API_KEY")),
        base_url=os.getenv("COMPANY_AUTH_BASE_URL", "https://api.openai.com/v1"),
    )
    model_name = os.getenv("COMPANY_AUTH_MODEL", "gpt-4o")

    return await parse_structured_response(
        client=client,
        model_name=model_name,
        input=user_input,
        system_prompt=SYSTEM_PROMPT,
        pydantic_model=CompanyAuth,
    )
