"""DNS verification and free email domain constants."""

from __future__ import annotations

_VERIFICATION_PREFIX = "prospectra-verify="
_VERIFICATION_HOST = "_prospectra"
_DNS_LIFETIME_SECONDS = 5.0
DEFAULT_DNS_NAMESERVERS = ["1.1.1.1", "8.8.8.8"]
DNS_INSTRUCTIONS_TITLE = "Add this DNS record to your domain provider:"

# Comprehensive set of consumer / free email providers disallowed for business sign-up & verification
FREE_EMAIL_DOMAINS: frozenset[str] = frozenset(
    {
        "gmail.com",
        "googlemail.com",
        "yahoo.com",
        "yahoo.co.uk",
        "yahoo.ca",
        "yahoo.co.in",
        "ymail.com",
        "rocketmail.com",
        "outlook.com",
        "hotmail.com",
        "hotmail.co.uk",
        "live.com",
        "msn.com",
        "icloud.com",
        "me.com",
        "mac.com",
        "aol.com",
        "protonmail.com",
        "proton.me",
        "pm.me",
        "zohomail.com",
        "yandex.com",
        "yandex.ru",
        "mail.com",
        "email.com",
        "gmx.com",
        "gmx.de",
        "gmx.net",
        "mail.ru",
        "fastmail.com",
        "tutanota.com",
        "tuta.com",
        "hey.com",
        "rediffmail.com",
        "qq.com",
        "163.com",
        "126.com",
    }
)
