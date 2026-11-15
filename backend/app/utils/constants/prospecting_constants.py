"""Prospecting pipeline, SearXNG, Reacher, domain filter, and threshold constants."""

from __future__ import annotations

import os
import re

PENDING_STATUS = "pending_review"
PENDING_STATUSES = frozenset({"pending_review", "discovered", "enriched"})
NON_RETRIGGERABLE_COMPANY_STATUSES = frozenset(
    {"email_drafted", "pending_send_approval", "sent", "replied"}
)
MAX_STALLED_RUNS = 3
DEFAULT_PENDING_THRESHOLD = 10

PAGES_PER_QUERY = int(os.environ.get("SEARXNG_PAGES_PER_QUERY", "2"))
MIN_SEARCH_ACCEPT_RATE = float(os.environ.get("SEARCH_MIN_ACCEPT_RATE", "0.25"))
MAX_CANDIDATES = int(os.environ.get("SEARXNG_MAX_CANDIDATES", "40"))
MAX_SEARCH_ATTEMPTS = int(os.environ.get("MAX_SEARCH_ATTEMPTS", "3"))

SCRAPER_CONCURRENCY = int(os.environ.get("SCRAPER_CONCURRENCY", "10"))
SCRAPER_TIMEOUT = float(os.environ.get("SCRAPER_TIMEOUT_SECONDS", "12"))
MAX_PAGES = int(os.environ.get("SCRAPER_MAX_PAGES_PER_SITE", "5"))
GUESS_GENERIC_EMAILS = os.environ.get("SCRAPER_GUESS_GENERIC_EMAILS", "true").lower() == "true"
STANDARD_GUESS_PREFIXES = ["contact", "info", "hello", "sales"]

REACHER_BASE_URL = os.environ.get("REACHER_BASE_URL", "http://localhost:8080").rstrip("/")
REACHER_SECRET = os.environ.get("REACHER_SECRET", "")
REACHER_CONCURRENCY = int(os.environ.get("REACHER_CONCURRENCY", "8"))
REACHER_TIMEOUT = float(os.environ.get("REACHER_TIMEOUT_SECONDS", "45"))
ACCEPT_RISKY = os.environ.get("REACHER_ACCEPT_RISKY", "false").lower() == "true"
REACHER_ACCEPT_RISKY_DEFAULT = ACCEPT_RISKY
REACHER_ACCEPT_UNKNOWN_IF_MX_VALID = (
    os.environ.get("REACHER_ACCEPT_UNKNOWN_IF_MX_VALID", "true").lower() == "true"
)

SEARXNG_BASE_URL = os.environ.get("SEARXNG_BASE_URL", "http://localhost:8888").rstrip("/")
SEARXNG_DEFAULT_LANGUAGE = os.environ.get("SEARXNG_DEFAULT_LANGUAGE", "en-US")

COMPANY_AUTH_CONCURRENCY = int(os.environ.get("COMPANY_AUTH_CONCURRENCY", "5"))
MIN_AUTH_SCORE = int(os.environ.get("COMPANY_AUTH_MIN_SCORE", "70"))
MAX_ACCEPTED_PER_RUN = int(os.environ.get("MAX_ACCEPTED_PER_RUN", "10"))

PARKED_DOMAIN_PATTERNS = [
    re.compile(r"domain (for sale|is parked|expired)", re.IGNORECASE),
    re.compile(r"(buy|purchase) this domain", re.IGNORECASE),
    re.compile(r"website (under construction|coming soon)", re.IGNORECASE),
    re.compile(r"parked by (godaddy|namecheap|sedo)", re.IGNORECASE),
]

PLATFORM_DOMAINS = {
    "linkedin.com",
    "facebook.com",
    "instagram.com",
    "twitter.com",
    "x.com",
}

BLOCKED_DOMAINS = {
    # General Media / Forums / Code (not client operating companies)
    "youtube.com", "tiktok.com", "pinterest.com", "reddit.com", "quora.com",
    "medium.com", "wikipedia.org", "vimeo.com", "github.com", "gitlab.com",
    # Job boards, Staffing & Freelance platforms (NEVER ADD JOBS)
    "indeed.com", "glassdoor.com", "ziprecruiter.com", "monster.com",
    "upwork.com", "fiverr.com", "freelancer.com", "toptal.com", "simplyhired.com",
    "careerbuilder.com", "wellfound.com", "angellist.com", "dice.com",
    "remoteok.com", "weworkremotely.com", "jobserve.com", "snagajob.com",
    "builtin.com", "handshake.com", "greenhouse.io", "lever.co",
    "workday.com", "smartrecruiters.com", "workable.com", "bamboohr.com",
    # Review & Directory Platforms
    "clutch.co", "goodfirms.co", "g2.com", "capterra.com", "trustpilot.com",
    "yelp.com", "yellowpages.com", "superpages.com", "bbb.org",
    "crunchbase.com", "zoominfo.com", "apollo.io", "dnb.com", "manta.com",
    "bloomberg.com", "forbes.com", "tripadvisor.com", "angi.com",
    "thumbtack.com", "houzz.com", "healthgrades.com", "zocdoc.com",
    "avvo.com", "justia.com", "findlaw.com", "alignable.com",
    # Search engines & Major tech
    "google.com", "bing.com", "yahoo.com", "duckduckgo.com", "apple.com", "microsoft.com",
    "amazon.com", "ebay.com", "etsy.com", "walmart.com",
}

BLOCKED_TLDS = {".gov", ".edu", ".mil"}

BLOCKED_PATH_PATTERNS = [
    re.compile(r"/(jobs?|careers?|vacancies|openings|apply|hiring|employment|positions?)(/|$)", re.IGNORECASE),
    re.compile(r"/(blog/top-|best-|list-of-)", re.IGNORECASE),
    re.compile(r"/(tag|category|topics?)/", re.IGNORECASE),
]

JOB_INDICATOR_PATTERNS = [
    re.compile(r"\b(job|jobs|hiring|careers?|employment|openings?|apply now|now hiring|internship|internships|vacancy|vacancies|position|positions)\b", re.IGNORECASE),
    re.compile(r"\b(we are hiring|join our team|job description|responsibilities:|requirements:|qualifications:)\b", re.IGNORECASE),
    re.compile(r"\b(job in [a-zA-Z\s]+|jobs in [a-zA-Z\s]+)\b", re.IGNORECASE),
    re.compile(r"\b(hourly rate|per hour|\$[0-9]+[kK]?\s*-\s*\$[0-9]+[kK]?|salary:)\b", re.IGNORECASE),
]

LISTICLE_TITLE_RE = re.compile(
    r"^(top\s+\d+|\d+\s+best|\d+\s+top|directory\s+of|list\s+of|the\s+\d+\s+best)",
    re.IGNORECASE,
)

AGENCY_KEYWORDS = [
    "software development agency",
    "software development company",
    "app development agency",
    "web development agency",
    "digital agency",
    "it consulting",
    "it consultancy",
    "dev shop",
    "hire developers",
    "hire dedicated developers",
    "staff augmentation",
    "offshore development",
    "nearshore development",
    "custom software development services",
    "software engineering services",
    "our developers build",
    "we build custom software",
]
