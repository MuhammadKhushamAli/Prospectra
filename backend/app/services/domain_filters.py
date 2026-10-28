"""Domain filtering, blocklist, and heuristic classification utilities."""

import re
from typing import Optional, Tuple
from urllib.parse import urlparse
import tldextract

# Platforms that host official company profile/business pages
PLATFORM_DOMAINS = {
    "linkedin.com",
    "facebook.com",
    "instagram.com",
    "twitter.com",
    "x.com",
}

# Domains to strictly exclude (job boards, media platforms, directories, search engines)
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

# Patterns specifically identifying job and recruitment postings
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

# Agency and dev-shop patterns to identify businesses that already sell dev work
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


def extract_registered_domain(url: str) -> Optional[str]:
    """Extract clean registered domain (e.g. example.co.uk) from URL."""
    if not url or not isinstance(url, str):
        return None
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    extracted = tldextract.extract(url)
    if extracted.domain and extracted.suffix:
        return f"{extracted.domain}.{extracted.suffix}".lower()
    return None


def is_job_posting(title: str = "", url: str = "", snippet: str = "") -> bool:
    """Detect if a search candidate represents a job vacancy or hiring post rather than a company."""
    if url:
        parsed = urlparse(url)
        path = parsed.path.lower()
        for pat in BLOCKED_PATH_PATTERNS:
            if pat.search(path):
                return True
        if any(term in parsed.query.lower() for term in ("job", "career", "hiring", "vacancy")):
            return True

    text_to_check = f"{title} {snippet}".strip()
    if text_to_check:
        for pat in JOB_INDICATOR_PATTERNS:
            if pat.search(text_to_check):
                return True

    return False


def is_blocked_url(url: str) -> bool:
    """Check if the URL belongs to a blocked domain, TLD, job board, or job path pattern.

    Allows company pages on social platforms (e.g. linkedin.com/company/...) while strictly
    rejecting job postings (e.g. linkedin.com/jobs/...) and dedicated job boards.
    """
    domain = extract_registered_domain(url)
    if not domain:
        return True

    # 1. Strictly blocked domains (job boards, review directories, search engines, general media)
    if domain in BLOCKED_DOMAINS:
        return True

    # 2. Check blocked TLDs
    for tld in BLOCKED_TLDS:
        if domain.endswith(tld):
            return True

    try:
        parsed = urlparse(url)
        path = parsed.path.lower().rstrip("/")
    except Exception:
        return True

    # 3. Check for general job / career path patterns across all websites
    for pat in BLOCKED_PATH_PATTERNS:
        if pat.search(path):
            return True

    # 4. Special handling for platform domains (LinkedIn, Facebook, etc.)
    if domain in PLATFORM_DOMAINS:
        if domain == "linkedin.com":
            # Strictly reject jobs, feeds, pulse articles, or individual profiles on LinkedIn
            if any(path.startswith(p) for p in ("/jobs", "/job", "/hiring", "/feed", "/posts", "/pulse", "/learning")):
                return True
            # Only allow company, school, or showcase pages on LinkedIn
            if not any(path.startswith(p) for p in ("/company/", "/school/", "/showcase/")):
                return True
            # Reject empty company root
            if path in ("/company", "/school", "/showcase"):
                return True
        elif domain in ("facebook.com", "instagram.com", "twitter.com", "x.com"):
            # Block sharing dialogs, help pages, and settings
            if any(skip in path for skip in ("/sharer", "/share.php", "/dialog", "/help", "/settings", "/policy")):
                return True

    return False


def extract_company_info_from_url(
    url: str,
    title: str = "",
    snippet: str = "",
) -> Tuple[str, str, Optional[str]]:
    """Extract distinct company domain, primary website, and linkedin_url.

    Handles both direct business websites and platform company pages (e.g. LinkedIn).
    Returns:
        (domain, website, linkedin_url)
    """
    reg_domain = extract_registered_domain(url) or "unknown.com"

    if reg_domain == "linkedin.com":
        parsed = urlparse(url)
        path_parts = [p for p in parsed.path.strip("/").split("/") if p]
        slug = path_parts[1] if len(path_parts) >= 2 else (path_parts[0] if path_parts else "company")
        # Check if an external official domain was mentioned in title or snippet
        external_domain = None
        for word in re.findall(r"[a-zA-Z0-9-]+\.[a-zA-Z]{2,}", f"{title} {snippet}"):
            extracted = extract_registered_domain(word)
            if extracted and extracted not in PLATFORM_DOMAINS and extracted not in BLOCKED_DOMAINS:
                external_domain = extracted
                break

        domain = external_domain or f"{slug}.linkedin"
        website = f"https://{external_domain}" if external_domain else url
        linkedin_url = url
        return domain, website, linkedin_url

    if reg_domain in PLATFORM_DOMAINS:
        parsed = urlparse(url)
        path_parts = [p for p in parsed.path.strip("/").split("/") if p]
        slug = path_parts[0] if path_parts else "page"
        domain = f"{slug}.{reg_domain.split('.')[0]}"
        return domain, url, None

    # Normal company domain
    return reg_domain, f"https://{reg_domain}", None


def is_listicle_title(title: str) -> bool:
    """Check if a search result title indicates a listicle or directory."""
    if not title:
        return False
    return bool(LISTICLE_TITLE_RE.search(title.strip()))


def count_agency_keyword_hits(text: str) -> int:
    """Count how many agency/dev-shop indicator phrases appear in text."""
    if not text:
        return 0
    lower_text = text.lower()
    return sum(1 for kw in AGENCY_KEYWORDS if kw in lower_text)
