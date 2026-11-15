"""Shared domain and email normalization and validation helpers used across multiple modules."""

from __future__ import annotations

import re
from typing import Optional
from urllib.parse import urlsplit

import tldextract

from app.utils.constants.dns_constants import FREE_EMAIL_DOMAINS
from app.utils.constants.email_constants import DEFAULT_MESSAGE_ID_DOMAIN

_EXTRACT_DOMAIN = tldextract.TLDExtract(
    suffix_list_urls=(),
    include_psl_private_domains=True,
)


def parse_domain_hostname(raw: str) -> str:
    """Parse and validate a raw domain input, rejecting URL paths, queries, or credentials."""
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("A domain is required")

    candidate = raw.strip()
    parsed = urlsplit(candidate if "://" in candidate else f"//{candidate}")
    if parsed.username or parsed.password or parsed.path not in ("", "/"):
        raise ValueError("Enter a domain name, not a URL or path")
    if parsed.query or parsed.fragment:
        raise ValueError("Enter a domain name without a query or fragment")

    try:
        hostname = parsed.hostname
        _ = parsed.port
    except ValueError as exc:
        raise ValueError("Invalid domain name") from exc

    if not hostname:
        raise ValueError("A domain is required")
    return hostname.rstrip(".")


def encode_idna_registrable_domain(hostname: str) -> str:
    """Extract registrable domain from hostname and encode labels as lowercase IDNA ASCII."""
    extracted = _EXTRACT_DOMAIN(hostname)
    if not extracted.domain or not extracted.suffix:
        raise ValueError("Enter a fully-qualified domain name")

    registrable = f"{extracted.domain}.{extracted.suffix}"
    try:
        normalized = ".".join(
            label.encode("idna").decode("ascii")
            for label in registrable.split(".")
        ).lower()
    except UnicodeError as exc:
        raise ValueError("Invalid internationalized domain name") from exc

    if len(normalized) > 253 or any(
        not label or len(label) > 63 for label in normalized.split(".")
    ):
        raise ValueError("Invalid domain name")
    return normalized


def normalize_domain(raw: str) -> str:
    """Return the registrable domain in lowercase ASCII (IDNA) form."""
    hostname = parse_domain_hostname(raw)
    return encode_idna_registrable_domain(hostname)


def extract_email_domain(email: str) -> str:
    """Extract and normalize the domain portion of an email address."""
    if not isinstance(email, str) or "@" not in email.strip():
        raise ValueError("Enter a valid email address.")
    local_part, _, domain_part = email.strip().rpartition("@")
    if not local_part or not domain_part:
        raise ValueError("Enter a valid email address.")
    return normalize_domain(domain_part)


def extract_sender_domain_or_default(
    email_address: str,
    default_domain: str = DEFAULT_MESSAGE_ID_DOMAIN,
) -> str:
    """Extract domain from an email address for Message-ID generation, with fallback."""
    if email_address and "@" in email_address:
        return email_address.split("@", 1)[1].strip().lower()
    return default_domain


def is_free_email_domain(domain_or_email: str) -> bool:
    """Return True if the email or domain belongs to a consumer/free email provider."""
    try:
        if "@" in domain_or_email:
            normalized = extract_email_domain(domain_or_email)
        else:
            normalized = normalize_domain(domain_or_email)
    except ValueError:
        return False
    return normalized in FREE_EMAIL_DOMAINS


def validate_email_domain_match(user_email: str, target_domain: str) -> tuple[str, str]:
    """Ensure the signed-in user's email is a business email and matches target_domain."""
    if not user_email or "@" not in user_email:
        raise ValueError("Authenticated user does not have a valid email address.")

    clean_email = user_email.strip().lower()
    user_domain = extract_email_domain(clean_email)
    if user_domain in FREE_EMAIL_DOMAINS:
        raise ValueError(
            f"Free email providers ({user_domain}) are not permitted. "
            "Please sign up and sign in with your organization domain email."
        )

    normalized_target = normalize_domain(target_domain)
    if normalized_target in FREE_EMAIL_DOMAINS:
        raise ValueError(
            f"Free email provider domains ({normalized_target}) cannot be verified."
        )

    if user_domain != normalized_target:
        raise ValueError(
            f"Domain mismatch: You are signed in as '{clean_email}', so you can only "
            f"verify the domain '{user_domain}' (received '{normalized_target}')."
        )

    return clean_email, normalized_target


def validate_main_mailbox_email(mailbox_email: str | None) -> str:
    """Validate and normalize the main mailbox email (stored as smtp_username in DB)."""
    if not mailbox_email or not mailbox_email.strip():
        raise ValueError("Main mailbox email (SMTP username) is required.")
    clean = mailbox_email.strip().lower()
    extract_email_domain(clean)
    return clean


def normalize_provider_slug(name: str) -> str:
    """Convert an arbitrary provider display name into a clean lowercase DB identifier."""
    slug = re.sub(r"[^a-z0-9]+", "_", (name or "").strip().lower()).strip("_")
    return slug or "other"


def extract_registered_domain(url: str) -> Optional[str]:
    """Extract clean registered domain (e.g. example.co.uk) from a URL or domain string."""
    if not url or not isinstance(url, str):
        return None
    clean_url = url.strip()
    if not clean_url.startswith(("http://", "https://")):
        clean_url = "https://" + clean_url
    extracted = tldextract.extract(clean_url)
    if extracted.domain and extracted.suffix:
        return f"{extracted.domain}.{extracted.suffix}".lower()
    return None


def format_org_website_url(org_domain: Optional[str]) -> Optional[str]:
    """Format a clean website URL with scheme from a domain string."""
    if not org_domain or not str(org_domain).strip():
        return None
    cleaned = str(org_domain).strip().rstrip("/")
    if cleaned.startswith(("http://", "https://")):
        return cleaned
    return f"https://{cleaned}"
