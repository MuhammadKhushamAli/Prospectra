"""Shared cross-module helper functions."""

from .dataclass_helpers import DictCompatibleDataclass, dataclass_to_json
from .db_status_helpers import (
    is_email_already_generated,
    is_email_sent,
    revert_company_status_to_pending,
    revert_email_to_draft_safe,
    set_email_status_safe,
)
from .domain_helpers import (
    extract_email_domain,
    extract_registered_domain,
    format_org_website_url,
    is_free_email_domain,
    normalize_domain,
    normalize_provider_slug,
    validate_email_domain_match,
)
from .state_helpers import (
    extract_org_and_user_from_state,
    extract_skill_names,
    extract_target_industries_list,
    resolve_company_id,
    resolve_org_id,
    resolve_state_company_id,
    resolve_user_id,
    validate_state_ids,
)
from .time_helpers import format_timestamp, unix_now, utc_now, utc_now_iso
from .uuid_helpers import is_valid_uuid

__all__ = [
    "DictCompatibleDataclass",
    "dataclass_to_json",
    "is_email_already_generated",
    "is_email_sent",
    "revert_company_status_to_pending",
    "revert_email_to_draft_safe",
    "set_email_status_safe",
    "extract_email_domain",
    "extract_registered_domain",
    "format_org_website_url",
    "is_free_email_domain",
    "normalize_domain",
    "normalize_provider_slug",
    "validate_email_domain_match",
    "extract_org_and_user_from_state",
    "extract_skill_names",
    "extract_target_industries_list",
    "resolve_company_id",
    "resolve_org_id",
    "resolve_state_company_id",
    "resolve_user_id",
    "validate_state_ids",
    "format_timestamp",
    "unix_now",
    "utc_now",
    "utc_now_iso",
    "is_valid_uuid",
]
