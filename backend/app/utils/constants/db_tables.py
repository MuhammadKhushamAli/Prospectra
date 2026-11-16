"""Centralized Supabase database table names and column sets."""

import os

ORGANIZATIONS_TABLE = os.environ.get("SUPABASE_ORGANIZATIONS_TABLE_NAME", "organizations")
ORGANIZATION_MEMBERS_TABLE = os.environ.get("SUPABASE_ORGANIZATION_MEMBERS_TABLE_NAME", "organization_members")
ORGANIZATION_INVITES_TABLE = os.environ.get("SUPABASE_ORGANIZATION_INVITES_TABLE_NAME", "organization_invites")
ORG_APPROVALS_TABLE = os.environ.get("SUPABASE_ORG_APPROVALS_TABLE_NAME", "org_approvals")
ORG_ACTIVITY_EVENTS_TABLE = os.environ.get("SUPABASE_ORG_ACTIVITY_EVENTS_TABLE_NAME", "org_activity_events")
COMPANIES_TABLE = os.environ.get("SUPABASE_COMPANIES_TABLE_NAME", "companies")
CONTACTS_TABLE = os.environ.get("SUPABASE_CONTACTS_TABLE_NAME", "contacts")
EMAILS_TABLE = os.environ.get("SUPABASE_EMAIL_TABLE_NAME", "emails")

DOMAIN_VERIFICATION_TABLE = (
    os.environ.get("DOMAIN_VERIFICATION_TABLE")
    or os.environ.get("SUPABASE_DOMAIN_VERIFICATIONS_TABLE_NAME", "domain_verifications")
)
DOMAIN_VERIFICATIONS_TABLE = DOMAIN_VERIFICATION_TABLE

ESP_PROVIDERS_TABLE = os.environ.get("ESP_PROVIDERS_TABLE", "esp_providers")
USER_PROFILES_TABLE = os.environ.get("SUPABASE_USER_PROFILES_TABLE_NAME", "user_profiles")
USER_SKILLS_TABLE = os.environ.get("SUPABASE_USER_SKILLS_TABLE_NAME", "user_skills")
SKILLS_TABLE = os.environ.get("SUPABASE_SKILLS_TABLE_NAME", "skills")
TARGET_INDUSTRIES_TABLE = os.environ.get("SUPABASE_TARGET_INDUSTRIES_TABLE_NAME", "target_industries")
USER_TARGET_INDUSTRIES_TABLE = os.environ.get(
    "SUPABASE_USER_TARGET_INDUSTRIES_TABLE_NAME",
    "user_target_industries",
)

SEARCH_PROGRESS_TABLE = os.environ.get("SUPABASE_SEARCH_PROGRESS_TABLE_NAME", "search_progress")
SEARCH_PROGRESS_SKILLS_TABLE = os.environ.get(
    "SUPABASE_SEARCH_PROGRESS_SKILLS_TABLE_NAME",
    "search_progress_skills",
)
SEARCH_PROGRESS_INDUSTRIES_TABLE = os.environ.get(
    "SUPABASE_SEARCH_PROGRESS_INDUSTRIES_TABLE_NAME",
    "search_progress_industries",
)

COMPANY_DB_COLUMNS = {
    "id",
    "org_id",
    "name",
    "domain",
    "industry",
    "size",
    "source",
    "website",
    "linkedin_url",
    "about_text",
    "need_hypothesis",
    "needed_skills",
    "needed_services",
    "need_signals",
    "proposed_solution",
    "services_offered",
    "digital_features",
    "auth_score",
    "auth_feedback",
    "raw_signals",
    "status",
    "discovered_by_user_id",
}
