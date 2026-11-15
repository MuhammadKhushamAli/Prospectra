"""Value objects and dataclasses used by the domain and email/SMTP verification workflows."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.utils.helpers.dataclass_helpers import DictCompatibleDataclass


@dataclass(frozen=True, slots=True)
class DomainVerificationInstructions:
    """DNS record details that can be shown to the person who owns a domain."""

    domain: str
    record_type: str
    record_name: str
    record_value: str


@dataclass(slots=True)
class DNSInstructionPayload(DictCompatibleDataclass):
    """Structured DNS TXT verification instruction payload."""

    title: str
    type: str
    host: str
    value: str


@dataclass(slots=True)
class AddDomainVerificationResult(DictCompatibleDataclass):
    """Structured result returned when adding or checking a domain to verify."""

    domain: str
    token: str
    verification_status: str
    verified: bool
    dns_instructions: dict[str, Any]
    smtp_username: str | None = None


@dataclass(slots=True)
class SpfDmarcAuditResult(DictCompatibleDataclass):
    """Structured result of SPF and DMARC DNS audit via checkdmarc and pyspf."""

    spf_valid: bool = False
    spf_record: str | None = None
    spf_result: str = "none"
    dmarc_valid: bool = False
    dmarc_record: str | None = None
    dmarc_policy: str | None = None
    warnings: list[str] = field(default_factory=list)


@dataclass(slots=True)
class SmtpConnectionProbeResult(DictCompatibleDataclass):
    """Structured result of an SMTP host DNS, TLS/SSL handshake, and login probe."""

    reachable: bool
    dns_resolved: bool
    smtp_used: str
    authenticated: bool | None = None
    banner: str | None = None
    error: str | None = None
    fallback_needed: bool = False


@dataclass(slots=True)
class CustomEspProviderConfig(DictCompatibleDataclass):
    """Structured custom ESP provider configuration stored in esp_providers."""

    id: str
    label: str
    smtp_server: str
    smtp_port: int = 587
    smtp_used: str = "STARTTLS"
    default_dkim_selectors: list[str] = field(default_factory=lambda: ["default"])
    is_custom: bool = True


@dataclass(slots=True)
class SmtpStoredConfig(DictCompatibleDataclass):
    """Structured SMTP configuration stored inside domain_verifications.dns_records.smtp_config."""

    sender_email: str
    esp_provider: str
    email_provider: str
    email_provider_id: str
    is_custom_provider: bool
    smtp_used: str
    smtp_server: str
    smtp_port: int
    smtp_username: str
    smtp_password: str
    dkim_selector: str | None = None


@dataclass(slots=True)
class EmailVerificationStoredDetails(DictCompatibleDataclass):
    """Structured email verification audit details stored in domain_verifications."""

    status: str
    verified: bool
    verified_at: str | None
    smtp_used: str
    authentication_results_header: str
    mx_valid: bool
    mx_records: list[str] = field(default_factory=list)
    spf_valid: bool = False
    spf_record: str | None = None
    spf_result: str = "none"
    dmarc_valid: bool = False
    dmarc_record: str | None = None
    dmarc_policy: str | None = None
    dkim_valid: bool = False
    dkim_selector: str | None = None
    smtp_reachable: bool = False
    smtp_authenticated: bool | None = None
    smtp_banner: str | None = None
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
