"""Domain ownership verification API."""

from .service import (
    complete_domain_verification,
    verify_domain,
)

__all__ = [
    "complete_domain_verification",
    "verify_domain",
]

