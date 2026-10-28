"""Asynchronous web scraper for extracting company profiles and contact details."""

import asyncio
import json
import re
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from email_validator import EmailNotValidError, validate_email
import httpx

from app.models.company import ScrapedProfile
from app.services.domain_filters import extract_registered_domain

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


def decode_cloudflare_email(cf_hex: str) -> str:
    """Decode Cloudflare obfuscated email from data-cfemail hex string."""
    try:
        r = int(cf_hex[:2], 16)
        email = "".join(
            chr(int(cf_hex[i : i + 2], 16) ^ r)
            for i in range(2, len(cf_hex), 2)
        )
        return email
    except Exception:
        return ""


def clean_emails(
    raw_emails: Set[str],
    company_domain: str,
) -> List[str]:
    """Clean, validate, deduplicate, and prioritize discovered email addresses."""
    cleaned: Set[str] = set()
    registered_company_domain = (
        extract_registered_domain(company_domain) or company_domain
    ).lower()

    for raw in raw_emails:
        if not raw or not isinstance(raw, str):
            continue
        e = raw.strip().lower()

        # Reject image/asset extensions matched accidentally
        if re.search(r"\.(png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2)$", e, re.IGNORECASE):
            continue

        # Reject obvious placeholder domains
        if e.endswith(("@example.com", "@domain.com", "@yourdomain.com", "@email.com")):
            continue

        try:
            valid = validate_email(e, check_deliverability=False)
            normalized = valid.normalized
        except EmailNotValidError:
            continue

        local_part, _, domain_part = normalized.partition("@")
        if local_part in DISALLOWED_EMAIL_LOCAL_PARTS:
            continue
        if domain_part in DISALLOWED_EMAIL_DOMAINS:
            continue

        cleaned.add(normalized)

    # Separate on-domain emails vs third-party/free-mail emails
    on_domain_emails: List[str] = []
    other_emails: List[str] = []

    for email in cleaned:
        _, _, d = email.partition("@")
        reg_d = extract_registered_domain(d) or d
        if reg_d == registered_company_domain:
            on_domain_emails.append(email)
        else:
            other_emails.append(email)

    def email_sort_key(email: str) -> int:
        local, _, _ = email.partition("@")
        # Prioritize personal named emails over generic
        if local in ("info", "contact", "hello", "support", "help", "office"):
            return 2
        if local in ("sales", "biz", "business", "inquiries"):
            return 1
        return 0  # Likely personal named email (e.g. john@, sarah.smith@)

    on_domain_emails.sort(key=email_sort_key)
    other_emails.sort(key=email_sort_key)

    # If we have on-domain emails, prefer them exclusively; otherwise allow up to 2 other emails
    if on_domain_emails:
        return on_domain_emails[:6]
    return other_emails[:2]


def extract_social_links(soup: BeautifulSoup) -> Dict[str, str]:
    """Extract links to social media profiles."""
    socials: Dict[str, str] = {}
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        lower_href = href.lower()
        if "linkedin.com/company" in lower_href and "linkedin" not in socials:
            socials["linkedin"] = href
        elif ("twitter.com/" in lower_href or "x.com/" in lower_href) and "twitter" not in socials:
            socials["twitter"] = href
        elif "facebook.com/" in lower_href and "facebook" not in socials:
            if not any(skip in lower_href for skip in ("sharer", "share.php", "dialog")):
                socials["facebook"] = href
        elif "instagram.com/" in lower_href and "instagram" not in socials:
            socials["instagram"] = href
    return socials


def extract_about_text(soup: BeautifulSoup, meta_desc: str) -> str:
    """Extract clean descriptive text about what the business actually does."""
    chunks: List[str] = []

    if meta_desc:
        chunks.append(meta_desc.strip())

    # Check OpenGraph description
    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        content = og_desc["content"].strip()
        if content and content != meta_desc:
            chunks.append(content)

    # Check JSON-LD Organization description
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "{}")
            if isinstance(data, dict):
                desc = data.get("description")
                if desc and isinstance(desc, str):
                    chunks.append(desc.strip())
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and item.get("description"):
                        chunks.append(str(item["description"]).strip())
        except Exception:
            continue

    # Extract text from main paragraphs and sections (stripping nav/footer/script/style)
    clone = BeautifulSoup(str(soup), "lxml")
    for bad in clone(["script", "style", "nav", "footer", "header", "noscript", "svg"]):
        bad.decompose()

    for p in clone.find_all(["p", "h1", "h2", "h3"]):
        text = p.get_text(" ", strip=True)
        if len(text) > 40 and not any(kw in text.lower() for kw in ("cookie policy", "terms of service", "all rights reserved")):
            chunks.append(text)
            if sum(len(c) for c in chunks) > 3000:
                break

    full_text = " ".join(chunks)
    # Collapse multiple whitespaces and truncate to ~2500 characters
    full_text = re.sub(r"\s+", " ", full_text).strip()
    return full_text[:2500]


async def fetch_page(
    client: httpx.AsyncClient,
    url: str,
    timeout: float = 12.0,
) -> Optional[Tuple[str, str]]:
    """Fetch a single page and return (final_url, html_text)."""
    try:
        response = await client.get(
            url,
            headers={"User-Agent": USER_AGENT},
            timeout=timeout,
            follow_redirects=True,
        )
        if response.status_code == 200 and "text/html" in response.headers.get("content-type", "").lower():
            return str(response.url), response.text
    except Exception:
        pass
    return None


from urllib.parse import parse_qs, unquote, urljoin, urlparse


def extract_website_from_platform_html(html: str) -> Optional[str]:
    """Extract official external company website linked from a LinkedIn or platform profile."""
    # 1. Check for LinkedIn redirect URL: https://www.linkedin.com/redir/redirect?url=...
    redir_match = re.search(r'linkedin\.com/redir/redirect\?url=([^"\'&]+)', html)
    if redir_match:
        try:
            cand = unquote(redir_match.group(1))
            if cand.startswith(("http://", "https://")):
                return cand
        except Exception:
            pass

    # 2. Check anchor tags with about_website or external hrefs
    try:
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if "trk=about_website" in href or (a.get_text() and "website" in a.get_text().lower()):
                if "linkedin.com/redir/redirect?url=" in href:
                    qs = parse_qs(urlparse(href).query)
                    if "url" in qs:
                        return unquote(qs["url"][0])
                elif not any(skip in href.lower() for skip in ("linkedin.com", "facebook.com", "google.com", "bing.com")):
                    return href
    except Exception:
        pass

    return None


def extract_services_and_features(soup: BeautifulSoup, html: str) -> Tuple[List[str], List[str]]:
    """Extract services offered by the business and detect operational digital features/gaps."""
    services: List[str] = []
    features: List[str] = []
    lower_html = html.lower()

    # Detect digital presence & operational features/gaps
    if any(k in lower_html for k in ("calendly.com", "acuityscheduling.com", "book-online", "book appointment", "schedule appointment", "online booking", "book an appointment")):
        features.append("online_booking_present")
    else:
        features.append("no_online_booking_detected")

    if any(k in lower_html for k in ("client portal", "patient portal", "customer portal", "member portal", "client login", "portal login", "sign in to portal")):
        features.append("client_portal_present")
    else:
        features.append("no_client_portal_detected")

    if any(k in lower_html for k in ("apple.com/app-store", "play.google.com/store/apps", "download on the app store", "get it on google play")):
        features.append("mobile_app_present")
    else:
        features.append("no_mobile_app_detected")

    if any(k in lower_html for k in ("shopify.com", "woocommerce", "cart", "checkout", "add to cart", "online store")):
        features.append("ecommerce_present")

    if "wp-content" in lower_html:
        features.append("wordpress_cms")
    elif "squarespace" in lower_html:
        features.append("squarespace_cms")
    elif "wix.com" in lower_html or "wixsite" in lower_html:
        features.append("wix_cms")

    # Extract services from service sections / headings / lists
    service_sections = soup.find_all(
        lambda tag: tag.name in ("section", "div", "ul") and any(
            kw in (tag.get("id", "") + " " + " ".join(tag.get("class", []))).lower()
            for kw in ("service", "treatment", "solution", "practice-area", "offering")
        )
    )
    for sec in service_sections[:3]:
        for item in sec.find_all(["h2", "h3", "h4", "li"]):
            txt = item.get_text(" ", strip=True)
            if 3 < len(txt) < 55 and txt not in services and not any(bad in txt.lower() for bad in ("read more", "view all", "contact us", "menu", "home", "privacy", "cookie", "copyright", "about")):
                services.append(txt)
                if len(services) >= 8:
                    break
        if len(services) >= 8:
            break

    return services[:8], features


async def scrape_company(
    client: httpx.AsyncClient,
    website: str,
    domain: str,
    max_pages: int = 5,
    timeout: float = 12.0,
) -> ScrapedProfile:
    """Scrape a target company website to extract profile text, emails, phones, and socials."""
    target_url = website
    if not target_url or not target_url.startswith(("http://", "https://")):
        target_url = f"https://{domain}"

    homepage_res = await fetch_page(client, target_url, timeout=timeout)
    if not homepage_res:
        # Retry with http if https failed
        if target_url.startswith("https://"):
            homepage_res = await fetch_page(client, target_url.replace("https://", "http://"), timeout=timeout)

    if not homepage_res:
        return ScrapedProfile(fetch_ok=False)

    final_url, homepage_html = homepage_res
    visited_urls: List[str] = [final_url]
    raw_emails: Set[str] = set()
    raw_phones: Set[str] = set()
    social_links: Dict[str, str] = {}
    about_text_pieces: List[str] = []
    discovered_website: Optional[str] = None
    discovered_domain: Optional[str] = None

    # Handle platform company pages (e.g. LinkedIn): extract official website and crawl it
    if "linkedin.com/company" in target_url:
        social_links["linkedin"] = target_url
        official_website = extract_website_from_platform_html(homepage_html)
        if official_website:
            official_domain = extract_registered_domain(official_website)
            if official_domain and official_domain != "linkedin.com":
                discovered_website = official_website
                discovered_domain = official_domain
                print(f"  [LINKEDIN CRAWL] Discovered official company website from LinkedIn: {official_website} ({official_domain})")
                official_res = await fetch_page(client, official_website, timeout=timeout)
                if official_res:
                    final_url, homepage_html = official_res
                    visited_urls = [final_url]
                    domain = official_domain

    soup = BeautifulSoup(homepage_html, "lxml")
    services_offered, digital_features = extract_services_and_features(soup, homepage_html)
    title = soup.title.string.strip() if (soup.title and soup.title.string) else ""
    meta_desc = ""
    meta_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "description"})
    if meta_tag and meta_tag.get("content"):
        meta_desc = meta_tag["content"].strip()

    social_links.update(extract_social_links(soup))
    about_text_pieces.append(extract_about_text(soup, meta_desc))

    # Extract emails from homepage
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.lower().startswith("mailto:"):
            email_part = href.split(":", 1)[1].split("?")[0].strip()
            if email_part:
                raw_emails.add(email_part)
        elif href.lower().startswith("tel:"):
            phone_part = href.split(":", 1)[1].split("?")[0].strip()
            if phone_part:
                raw_phones.add(phone_part)

    # Cloudflare protected emails
    for cf in soup.find_all(attrs={"data-cfemail": True}):
        decoded = decode_cloudflare_email(cf["data-cfemail"])
        if decoded:
            raw_emails.add(decoded)

    # Regex matches in homepage text
    body_text = soup.get_text(" ")
    for match in EMAIL_REGEX.findall(body_text):
        raw_emails.add(match)

    for match in PHONE_REGEX.findall(body_text):
        raw_phones.add(match.strip())

    # Find internal subpages matching contact/about keywords
    internal_subpages: List[str] = []
    base_domain = extract_registered_domain(final_url) or domain

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        abs_url = urljoin(final_url, href)
        parsed = urlparse(abs_url)
        path = parsed.path.lower()

        # Ensure same registered domain
        link_reg_domain = extract_registered_domain(parsed.netloc)
        if link_reg_domain == base_domain and abs_url not in visited_urls:
            if any(kw in path for kw in CANDIDATE_PATH_KEYWORDS) or any(kw in a.get_text().lower() for kw in CANDIDATE_PATH_KEYWORDS):
                if abs_url not in internal_subpages:
                    internal_subpages.append(abs_url)

    # Fetch candidate subpages concurrently up to max_pages
    pages_to_fetch = internal_subpages[: max_pages - 1]
    if pages_to_fetch:
        tasks = [fetch_page(client, u, timeout=timeout) for u in pages_to_fetch]
        subpage_results = await asyncio.gather(*tasks, return_exceptions=True)

        for res in subpage_results:
            if not isinstance(res, tuple) or not res:
                continue
            sub_url, sub_html = res
            visited_urls.append(sub_url)
            sub_soup = BeautifulSoup(sub_html, "lxml")

            # Extract mailto / tel
            for a in sub_soup.find_all("a", href=True):
                href = a["href"].strip()
                if href.lower().startswith("mailto:"):
                    raw_emails.add(href.split(":", 1)[1].split("?")[0].strip())
                elif href.lower().startswith("tel:"):
                    raw_phones.add(href.split(":", 1)[1].split("?")[0].strip())

            for cf in sub_soup.find_all(attrs={"data-cfemail": True}):
                decoded = decode_cloudflare_email(cf["data-cfemail"])
                if decoded:
                    raw_emails.add(decoded)

            sub_text = sub_soup.get_text(" ")
            for match in EMAIL_REGEX.findall(sub_text):
                raw_emails.add(match)
            for match in PHONE_REGEX.findall(sub_text):
                raw_phones.add(match.strip())

            # De-obfuscate text e.g. "info [at] domain.com"
            deobf = OBFUSCATED_AT.sub("@", sub_text)
            deobf = OBFUSCATED_DOT.sub(".", deobf)
            for match in EMAIL_REGEX.findall(deobf):
                raw_emails.add(match)

            social_links.update(extract_social_links(sub_soup))
            sub_about = extract_about_text(sub_soup, "")
            if sub_about:
                about_text_pieces.append(sub_about)

    final_about = " ".join(about_text_pieces)[:3000]
    cleaned_email_list = clean_emails(raw_emails, domain)

    return ScrapedProfile(
        about_text=final_about,
        meta_description=meta_desc,
        title=title,
        pages_visited=visited_urls,
        emails=cleaned_email_list,
        phones=list(raw_phones)[:4],
        social_links=social_links,
        fetch_ok=True,
        discovered_website=discovered_website,
        discovered_domain=discovered_domain,
        services_offered=services_offered,
        digital_features=digital_features,
    )
