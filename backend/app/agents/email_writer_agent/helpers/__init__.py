"""Email writer agent helper modules."""

from .email_writer_helpers import (
    build_email_prompt,
    extract_target_company_signals,
    extract_user_skills,
    format_org_website_url,
    generate_fallback_email,
)

__all__ = [
    "build_email_prompt",
    "extract_target_company_signals",
    "extract_user_skills",
    "format_org_website_url",
    "generate_fallback_email",
]
