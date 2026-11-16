"""Email template construction for teammate organization invitations."""

from __future__ import annotations

import os

DEFAULT_APP_URL = os.environ.get("EXPO_PUBLIC_APP_URL", "http://localhost:8081")


def build_invite_signup_url(token: str, email: str, base_url: str | None = None) -> str:
    """Construct the signup URL containing invite token and prefilled email parameter."""
    app_base = (base_url or os.environ.get("APP_SIGNUP_URL") or DEFAULT_APP_URL).rstrip("/")
    return f"{app_base}/auth?invite={token}&email={email}"


def build_invite_email_content(
    org_name: str,
    inviter_name: str,
    email: str,
    signup_url: str,
) -> tuple[str, str]:
    """Build subject line and plain-text body for an invitation email."""
    subject = f"You've been invited to join {org_name} on Prospectra"
    body = (
        f"Hi there,\n\n"
        f"{inviter_name} has invited you to join the {org_name} workspace on Prospectra.\n\n"
        f"Please click the link below to sign up and access your team workspace:\n"
        f"{signup_url}\n\n"
        f"When you sign up using your email ({email}), your workspace access will be activated immediately.\n\n"
        f"Best regards,\n"
        f"The {org_name} Team"
    )
    return subject, body


__all__ = ["build_invite_email_content", "build_invite_signup_url"]
