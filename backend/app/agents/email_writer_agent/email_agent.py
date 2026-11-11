"""Email-writer agent.

Takes the user's skills, name, email, and target company and generates
an outreach email (subject + body) tailored to the company's specific needs
and the user's matching skills.
"""

import json
import os
from dataclasses import asdict
from typing import Dict, Any, List, Optional

from openai import AsyncOpenAI

from app.core.llms.open_ai_llm import parse_structured_response
from app.models.company import Company
from app.models.user_context import UserContext
from .pydantic_model.email_model import EmailContent

SYSTEM_PROMPT = """
You are Prospectra's elite cold outreach email-writer agent.

You receive:
1. The user's context - the profile, headline, organization name, organization primary domain, and skills of the user sending the email.
2. The target company - the company's profile, industry, and specifically detected needs, hypotheses, and required skills.
3. (Optional) The current email draft if an email already exists for this company.
4. (Optional) User feedback directing how to improve or modify the email draft.
5. (Optional) Verifier review feedback to improve upon if this is an automated revision.

Your job is to write or modify a highly personalized, compelling outreach email that:
- If a current email draft and user feedback are provided: Modify and refine the existing draft directly addressing the user's feedback, while maintaining strong positioning and natural human tone.
- Has a clear, curiosity-inducing subject line mentioning the company or specific opportunity.
- Has a warm, professional opening referencing the company's focus or contact name if available.
- Directly addresses the company's specific pain point or need hypothesis (e.g., need for automation, specific technical expertise, or modernizing their stack).
- Highlights how the user's relevant skills directly solve this need, with concrete positioning.
- Seamlessly includes the sender's organization primary website domain in the email content (e.g. "Feel free to check out our work at https://{domain}" or "You can learn more about our team and track record at {domain}"), giving the recipient a direct link to explore the organization.
- Proposes a low-friction call to action (e.g. 10-minute chat or brief feedback exchange).
- Is concise, natural, and human - strictly 3 to 4 short paragraphs.

CRITICAL RULES:
- Only generate the subject and body. Do NOT include email header fields (from/to).
- Use the user's real name and relevant skills from the provided context.
- When an organization primary domain is provided, you MUST include it in the email body content as a link/reference for the recipient to inspect the organization website.
- When user feedback is provided, prioritize it and strictly adjust the email tone, content, or focus as requested.
- Never invent unrelated services; ground the pitch in the company's actual needed skills and signals.
"""


def extract_user_skills(user_context: UserContext) -> List[str]:
    """Extract clean skill names from the UserContext."""
    if not user_context.skills:
        return []
    skill_names: List[str] = []
    for s in user_context.skills:
        if isinstance(s, str):
            skill_names.append(s)
        elif hasattr(s, "name"):
            skill_names.append(s.name)
    return skill_names


def extract_target_company_signals(target_company: Company) -> Dict[str, Any]:
    """Extract targeted signals, need hypothesis, and contact details from the company."""
    contacts_info: List[Dict[str, str]] = []
    for em in target_company.emails or []:
        contacts_info.append({
            "name": f"{em.first_name or ''} {em.last_name or ''}".strip() or "Team",
            "role": em.email_of or "Contact",
            "email": em.email,
        })

    return {
        "company_name": target_company.name,
        "domain": target_company.domain,
        "industry": target_company.industry,
        "website": target_company.website,
        "about": target_company.about_text,
        "need_hypothesis": target_company.need_hypothesis,
        "needed_skills": target_company.needed_skills,
        "needed_services": target_company.needed_services,
        "need_signals": target_company.need_signals,
        "proposed_solution": target_company.proposed_solution,
        "services_offered": target_company.services_offered,
        "digital_features": target_company.digital_features,
        "contacts": contacts_info,
    }


def build_email_prompt(
    user_context: UserContext,
    target_company: Company,
    review_feedback: Optional[str] = None,
    user_feedback: Optional[str] = None,
    existing_email: Optional[Dict[str, Any]] = None,
) -> str:
    """Build structured input payload for the email writer LLM."""
    user_skills = extract_user_skills(user_context)
    user_data = {
        "full_name": user_context.full_name,
        "headline": getattr(user_context, "headline", None),
        "email": user_context.email,
        "organization_name": getattr(user_context, "org_name", None),
        "organization_primary_domain": getattr(user_context, "org_domain", None),
        "github_url": user_context.github_url,
        "linkedin_url": user_context.linkedin_url,
        "skills": user_skills,
        "target_industries": user_context.target_industries,
    }

    company_data = extract_target_company_signals(target_company)

    prompt_parts = [
        f"USER CONTEXT:\n{json.dumps(user_data, indent=2, default=str)}",
        f"TARGET COMPANY & OPPORTUNITY SIGNALS:\n{json.dumps(company_data, indent=2, default=str)}",
    ]

    if existing_email:
        subj = existing_email.get("subject") or "Outreach Inquiry"
        body = existing_email.get("body") or ""
        prompt_parts.append(
            f"CURRENT EMAIL DRAFT TO REVISE:\nSubject: {subj}\n\nBody:\n{body}"
        )

    if user_feedback:
        prompt_parts.append(
            f"USER FEEDBACK TO INCORPORATE:\n{user_feedback}\n"
            "CRITICAL: The user has explicitly requested the changes above. Modify and refine the email according to this feedback."
        )

    if review_feedback:
        prompt_parts.append(
            f"PREVIOUS REVIEW FEEDBACK TO ADDRESS:\n{review_feedback}\n"
            "Please refine the email so it directly resolves this feedback."
        )

    return "\n\n".join(prompt_parts)


def format_org_website_url(org_domain: Optional[str]) -> Optional[str]:
    """Format a clean website URL with scheme from a domain string."""
    if not org_domain or not str(org_domain).strip():
        return None
    cleaned = str(org_domain).strip().rstrip("/")
    if cleaned.startswith("http://") or cleaned.startswith("https://"):
        return cleaned
    return f"https://{cleaned}"


def generate_fallback_email(
    user_context: UserContext,
    target_company: Company,
    user_feedback: Optional[str] = None,
    existing_email: Optional[Dict[str, Any]] = None,
) -> EmailContent:
    """Generate a high-quality deterministic email if the LLM provider is unavailable."""
    company_name = target_company.name or "your team"
    user_name = user_context.full_name or "Alex"
    headline = getattr(user_context, "headline", "") or "software engineer"
    user_skills = extract_user_skills(user_context)
    skills_text = ", ".join(user_skills[:3]) if user_skills else "specialized engineering"

    org_name = getattr(user_context, "org_name", None) or "our team"
    org_domain = getattr(user_context, "org_domain", None)
    website_url = format_org_website_url(org_domain)

    # If an existing email is being revised, modify it with the feedback
    if existing_email and existing_email.get("body"):
        subject = existing_email.get("subject") or f"Growth opportunities for {company_name}"
        current_body = existing_email.get("body", "")
        if user_feedback:
            # Weave user feedback into the body
            modified_body = (
                f"{current_body}\n\n"
                f"Additionally, regarding your focus: {user_feedback.strip()}."
            )
        else:
            modified_body = current_body
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


async def write_email(
    user_context: UserContext,
    target_company: Company,
    review_feedback: Optional[str] = None,
    user_feedback: Optional[str] = None,
    existing_email: Optional[Dict[str, Any]] = None,
) -> EmailContent:
    """Generate an outreach email body tailored to the target company and user context."""
    user_input = build_email_prompt(
        user_context=user_context,
        target_company=target_company,
        review_feedback=review_feedback,
        user_feedback=user_feedback,
        existing_email=existing_email,
    )

    api_key = (
        os.getenv("EMAIL_AGENT_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or os.getenv("PARAM_GEN_API_KEY")
    )
    base_url = os.getenv("EMAIL_AGENT_BASE_URL", "https://api.openai.com/v1")
    model_name = os.getenv("EMAIL_AGENT_MODEL", "gpt-4o")

    if not api_key:
        return generate_fallback_email(
            user_context=user_context,
            target_company=target_company,
            user_feedback=user_feedback,
            existing_email=existing_email,
        )

    try:
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        return await parse_structured_response(
            client=client,
            model_name=model_name,
            input=user_input,
            system_prompt=SYSTEM_PROMPT,
            pydantic_model=EmailContent,
        )
    except Exception as e:
        print(f"Warning: OpenAI email generation failed ({e}), using fallback email generator.")
        return generate_fallback_email(
            user_context=user_context,
            target_company=target_company,
            user_feedback=user_feedback,
            existing_email=existing_email,
        )
