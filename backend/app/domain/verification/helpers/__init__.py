"""Domain and Email/SMTP verification helper modules."""

from .authres_helpers import _build_authres_header
from .dkim_helpers import (
    _check_dkim_with_dkimpy,
    build_dkim_selector_candidates,
    validate_dkim_txt_record,
)
from .dns_helpers import (
    build_dns_instructions,
    create_async_dns_resolver,
    create_sync_dns_resolver,
    decode_txt_rdata,
    matches_txt_token,
    parse_dns_records_dict,
)
from .domain_db_helpers import (
    build_email_verification_db_payloads,
    fetch_custom_esp_providers,
    fetch_existing_domain_record,
    persist_email_verification_payload,
    register_custom_esp_provider,
    resolve_stored_smtp_username,
    update_existing_domain_verification,
    upsert_initial_domain_verification,
)
from .mx_helpers import _check_mx_with_dnspython
from .smtp_probe_helpers import (
    _infer_protocol_for_port,
    _verify_smtp_connection_sync,
    build_dns_audit_warnings,
    probe_smtp_ssl_connection,
    probe_smtp_starttls_or_plain_connection,
    resolve_provider_preset,
    resolve_smtp_host_dns,
    validate_smtp_input_parameters,
)
from .spf_dmarc_helpers import (
    _check_spf_and_dmarc_with_checkdmarc_and_pyspf,
    audit_dmarc_with_checkdmarc,
    audit_spf_with_checkdmarc,
    evaluate_pyspf_query,
    fallback_resolve_dmarc_txt,
    fallback_resolve_spf_txt,
)

__all__ = [
    "_build_authres_header",
    "_check_dkim_with_dkimpy",
    "_check_mx_with_dnspython",
    "_check_spf_and_dmarc_with_checkdmarc_and_pyspf",
    "_infer_protocol_for_port",
    "_verify_smtp_connection_sync",
    "audit_dmarc_with_checkdmarc",
    "audit_spf_with_checkdmarc",
    "build_dkim_selector_candidates",
    "build_dns_audit_warnings",
    "build_dns_instructions",
    "build_email_verification_db_payloads",
    "create_async_dns_resolver",
    "create_sync_dns_resolver",
    "decode_txt_rdata",
    "evaluate_pyspf_query",
    "fallback_resolve_dmarc_txt",
    "fallback_resolve_spf_txt",
    "fetch_custom_esp_providers",
    "fetch_existing_domain_record",
    "matches_txt_token",
    "parse_dns_records_dict",
    "persist_email_verification_payload",
    "probe_smtp_ssl_connection",
    "probe_smtp_starttls_or_plain_connection",
    "register_custom_esp_provider",
    "resolve_provider_preset",
    "resolve_smtp_host_dns",
    "resolve_stored_smtp_username",
    "update_existing_domain_verification",
    "upsert_initial_domain_verification",
    "validate_dkim_txt_record",
    "validate_smtp_input_parameters",
]
