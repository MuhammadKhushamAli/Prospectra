"""Domain ownership verification API."""

from .service import (
    add_domain_to_verify,
    domain_verification,
)

__all__ = [
    "add_domain_to_verify",
    "domain_verification",
]

