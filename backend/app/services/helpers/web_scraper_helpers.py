"""Helper functions for HTML parsing, email cleaning, and feature extraction in the web scraper."""

from __future__ import annotations

import json
import re
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import parse_qs, unquote, urljoin, urlparse

from bs4 import BeautifulSoup
from email_validator import EmailNotValidError, validate_email
import httpx

from app.utils.constants.scraper_constants import (
    CANDIDATE_PATH_KEYWORDS,
    DISALLOWED_EMAIL_DOMAINS,
    DISALLOWED_EMAIL_LOCAL_PARTS,
    EMAIL_REGEX,
    OBFUSCATED_AT,
    OBFUSCATED_DOT,
    PHONE_REGEX,
    USER_AGENT,
)
from app.utils.helpers.domain_helpers import extract_registered_domain


def decode_cloudflare_email(cf_hex: str) -> str:
    """Decode Cloudflare obfuscated email from data-cfemail hex string."""
    try:
        r = int(cf_hex[:2], 16)
        return "".join(
            chr(int(cf_hex[i : i + 2], 16) ^ r)
            for i in range(2, len(cf_hex), 2)
        )
    except Exception:
        return ""


def _email_priority_key(email: str) -> int:
    """Prioritize personal named emails over sales or generic inbox prefixes."""
    local, _, _ = email.partition("@")
    if local in ("info", "contact", "hello", "support", "help", "office"):
        return 2
    if local in ("sales", "biz", "business", "inquiries"):
        return 1
    return 0


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

        if re.search(r"\.(png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2)$", e, re.IGNORECASE):
            continue
        if e.endswith(("@example.com", "@domain.com", "@yourdomain.com", "@email.com")):
            continue

        try:
            valid = validate_email(e, check_deliverability=False)
            normalized = valid.normalized
        except EmailNotValidError:
            continue

        local_part, _, domain_part = normalized.partition("@")
        if local_part in DISALLOWED_EMAIL_LOCAL_PARTS or domain_part in DISALLOWED_EMAIL_DOMAINS:
            continue

        cleaned.add(normalized)

    on_domain_emails: List[str] = []
    other_emails: List[str] = []

    for email in cleaned:
        _, _, d = email.partition("@")
        reg_d = extract_registered_domain(d) or d
        if reg_d == registered_company_domain:
            on_domain_emails.append(email)
        else:
            other_emails.append(email)

    on_domain_emails.sort(key=_email_priority_key)
    other_emails.sort(key=_email_priority_key)

    if on_domain_emails:
        return on_domain_emails[:6]
    return other_emails[:2]


def extract_social_links(soup: BeautifulSoup) -> Dict[str, str]:
    """Extract links to social media profiles from parsed HTML."""
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

    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        content = og_desc["content"].strip()
        if content and content != meta_desc:
            chunks.append(content)

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

    clone = BeautifulSoup(str(soup), "lxml")
    for bad in clone(["script", "style", "nav", "footer", "header", "noscript", "svg"]):
        bad.decompose()

    for p in clone.find_all(["p", "h1", "h2", "h3"]):
        text = p.get_text(" ", strip=True)
        if len(text) > 40 and not any(
            kw in text.lower() for kw in ("cookie policy", "terms of service", "all rights reserved")
        ):
            chunks.append(text)
            if sum(len(c) for c in chunks) > 3000:
                break

    full_text = re.sub(r"\s+", " ", " ".join(chunks)).strip()
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


def extract_website_from_platform_html(html: str) -> Optional[str]:
    """Extract official external company website linked from a LinkedIn or platform profile."""
    redir_match = re.search(r'linkedin\.com/redir/redirect\?url=([^"\'&]+)', html)
    if redir_match:
        try:
            cand = unquote(redir_match.group(1))
            if cand.startswith(("http://", "https://")):
                return cand
        except Exception:
            pass

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

    service_sections = soup.find_all(
        lambda tag: tag.name in ("section", "div", "ul") and any(
            kw in (tag.get("id", "") + " " + " ".join(tag.get("class", []))).lower()
            for kw in ("service", "treatment", "solution", "practice-area", "offering")
        )
    )
    for sec in service_sections[:3]:
        for item in sec.find_all(["h2", "h3", "h4", "li"]):
            txt = item.get_text(" ", strip=True)
            if 3 < len(txt) < 55 and txt not in services and not any(
                bad in txt.lower() for bad in ("read more", "view all", "contact us", "menu", "home", "privacy", "cookie", "copyright", "about")
            ):
                services.append(txt)
                if len(services) >= 8:
                    break
        if len(services) >= 8:
            break

    return services[:8], features


def extract_contacts_from_soup(
    soup: BeautifulSoup,
    raw_emails: Set[str],
    raw_phones: Set[str],
    deobfuscate: bool = False,
) -> None:
    """Extract mailto, tel, Cloudflare-encoded emails, and regex emails/phones from a BeautifulSoup tree."""
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

    for cf in soup.find_all(attrs={"data-cfemail": True}):
        decoded = decode_cloudflare_email(cf["data-cfemail"])
        if decoded:
            raw_emails.add(decoded)

    body_text = soup.get_text(" ")
    for match in EMAIL_REGEX.findall(body_text):
        raw_emails.add(match)
    for match in PHONE_REGEX.findall(body_text):
        raw_phones.add(match.strip())

    if deobfuscate:
        deobf = OBFUSCATED_AT.sub("@", body_text)
        deobf = OBFUSCATED_DOT.sub(".", deobf)
        for match in EMAIL_REGEX.findall(deobf):
            raw_emails.add(match)


def discover_internal_subpages(
    soup: BeautifulSoup,
    final_url: str,
    base_domain: str,
    visited_urls: List[str],
) -> List[str]:
    """Find candidate internal subpages matching contact/about/service keywords."""
    internal_subpages: List[str] = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        abs_url = urljoin(final_url, href)
        parsed = urlparse(abs_url)
        path = parsed.path.lower()

        link_reg_domain = extract_registered_domain(parsed.netloc)
        if link_reg_domain == base_domain and abs_url not in visited_urls:
            if any(kw in path for kw in CANDIDATE_PATH_KEYWORDS) or any(
                kw in a.get_text().lower() for kw in CANDIDATE_PATH_KEYWORDS
            ):
                if abs_url not in internal_subpages:
                    internal_subpages.append(abs_url)
    return internal_subpages
