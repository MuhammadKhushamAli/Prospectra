"""Domain ownership verification API."""

from .models import DomainVerificationInstructions
from .service import start_domain_verification, verify_domain

__all__ = [
    "DomainVerificationInstructions",
    "start_domain_verification",
    "verify_domain",
]

