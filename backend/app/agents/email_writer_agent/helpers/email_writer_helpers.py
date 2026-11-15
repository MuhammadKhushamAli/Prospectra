"""Helper functions for building email writer prompts and deterministic fallback emails."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.agents.email_writer_agent.pydantic_model.email_model import EmailContent
from app.models.company import Company
from app.models.summaries import TargetCompanySignalSummary, UserContextSummary
from app.models.user_context import UserContext
from app.utils.constants.email_constants import DEFAULT_EMAIL_SUBJECT
from app.utils.helpers.dataclass_helpers import dataclass_to_json
from app.utils.helpers.domain_helpers import format_org_website_url
from app.utils.helpers.state_helpers import extract_skill_names


def extract_user_skills(user_context: UserContext) -> List[str]:
    """Extract clean skill names from the UserContext."""
    return extract_skill_names(user_context)


def extract_target_company_signals(target_company: Company) -> TargetCompanySignalSummary:
    """Extract targeted signals, need hypothesis, and contact details into a TargetCompanySignalSummary dataclass."""
    return TargetCompanySignalSummary.from_company(target_company)


def build_email_prompt(
    user_context: UserContext,
    target_company: Company,
    review_feedback: Optional[str] = None,
    existing_email: Optional[Dict[str, Any]] = None,
) -> str:
    """Build structured input payload for the email writer LLM."""
    user_summary = UserContextSummary.from_user_context(user_context)
    company_summary = extract_target_company_signals(target_company)

    prompt_parts = [
        f"USER CONTEXT:\n{dataclass_to_json(user_summary, indent=2)}",
        f"TARGET COMPANY & OPPORTUNITY SIGNALS:\n{dataclass_to_json(company_summary, indent=2)}",
    ]

    if existing_email:
        subj = existing_email.get("subject") or DEFAULT_EMAIL_SUBJECT
        body = existing_email.get("body") or ""
        prompt_parts.append(
            f"CURRENT EMAIL DRAFT TO REVISE:\nSubject: {subj}\n\nBody:\n{body}"
        )

    if review_feedback:
        prompt_parts.append(
            f"PREVIOUS REVIEW FEEDBACK TO ADDRESS:\n{review_feedback}\n"
            "Please refine the email so it directly resolves this feedback."
        )

    return "\n\n".join(prompt_parts)


def generate_fallback_email(
    user_context: UserContext,
    target_company: Company,
    user_feedback: Optional[str] = None,
    existing_email: Optional[Dict[str, Any]] = None,
) -> EmailContent:
    """Generate a high-quality deterministic email if the LLM provider is unavailable."""
    company_name = target_company.name or ""
    user_name = user_context.full_name or ""
    headline = user_context.headline or ""
    user_skills = extract_user_skills(user_context)
    skills_text = ", ".join(user_skills[:3]) if user_skills else "specialized engineering"

    org_name = getattr(user_context, "org_name", None) or "our team"
    org_domain = getattr(user_context, "org_domain", None)
    website_url = format_org_website_url(org_domain)

    if existing_email and existing_email.get("body"):
        subject = existing_email.get("subject") or f"Growth opportunities for {company_name}"
        current_body = existing_email.get("body", "")
        modified_body = (
            f"{current_body}\n\nAdditionally, regarding your focus: {user_feedback.strip()}."
            if user_feedback
            else current_body
        )
        return EmailContent(subject=subject, body=modified_body)

    hypothesis = (
        target_company.need_hypothesis
        or f"scaling technological infrastructure in {target_company.industry or 'your industry'}"
    )
    org_reference = (
        f" You can explore our organization's background and past work at {website_url}."
        if website_url
        else ""
    )
    feedback_addition = (
        f" Focusing particularly on: {user_feedback.strip()}."
        if user_feedback
        else ""
    )

    subject = f"Solving {target_company.industry or 'tech'} growth opportunities at {company_name}"
    body = (
        f"Hi {company_name} Team,\n\n"
        f"I came across {company_name} and noticed your work in {target_company.industry or 'the industry'}. "
        f"In particular, I saw potential opportunities around {hypothesis}.{feedback_addition}\n\n"
        f"As a {headline} at {org_name} with experience in {skills_text}, I help organizations streamline development and execute "
        f"high-impact technical initiatives. We've built solutions that directly target these technical requirements.{org_reference}\n\n"
        f"Would you be open to a brief 10-minute chat next Tuesday to explore if this could be valuable for {company_name}?\n\n"
        f"Best regards,\n{user_name}"
    )
    return EmailContent(subject=subject, body=body)
