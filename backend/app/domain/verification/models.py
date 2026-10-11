"""Value objects used by the domain-verification workflow."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class DomainVerificationInstructions:
    """DNS record details that can be shown to the person who owns a domain."""

    domain: str
    record_type: str
    record_name: str
    record_value: str

