"""Web scraper regexes, user agents, and extraction constants."""

import re

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36 ProspectraBot/1.0"
)

EMAIL_REGEX = re.compile(
    r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+",
    re.IGNORECASE,
)

PHONE_REGEX = re.compile(
    r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
)

# De-obfuscation patterns
OBFUSCATED_AT = re.compile(r"\[\s*at\s*\]|\(\s*at\s*\)|<\s*at\s*>|\s+at\s+", re.IGNORECASE)
OBFUSCATED_DOT = re.compile(r"\[\s*dot\s*\]|\(\s*dot\s*\)|<\s*dot\s*>|\s+dot\s+", re.IGNORECASE)

DISALLOWED_EMAIL_DOMAINS = {
    "sentry.io", "wixpress.com", "godaddy.com", "squarespace.com",
    "wordpress.org", "wordpress.com", "shopify.com", "myshopify.com",
    "gravatar.com", "cloudflare.com",
}

DISALLOWED_EMAIL_LOCAL_PARTS = {
    "noreply", "no-reply", "donotreply", "do-not-reply",
    "example", "sample", "yourname", "youremail", "email",
    "privacy", "abuse", "postmaster", "hostmaster",
}

CANDIDATE_PATH_KEYWORDS = [
    "about", "about-us", "company", "who-we-are", "our-story", "team",
    "contact", "contact-us", "get-in-touch", "reach-us",
    "services", "our-services", "what-we-do", "solutions", "treatments",
]
