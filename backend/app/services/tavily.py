import os
from typing import Any, Dict, List
from urllib.parse import urlparse

from tavily import AsyncTavilyClient

from ..agents.params_generation.pydantic_model import TavilyPrompt


JOB_AND_AGGREGATOR_DOMAINS = [
    "indeed.com",
    "glassdoor.com",
    "linkedin.com",
    "ziprecruiter.com",
    "wellfound.com",
    "builtin.com",
    "greenhouse.io",
    "lever.co",
    "workable.com",
    "simplyhired.com",
    "monster.com",
    "remoterocketship.com",
    "upwork.com",
    "fiverr.com",
    "freelancer.com",
    "dice.com",
    "weworkremotely.com",
    "remoteok.com",
    "careerbuilder.com",
    "adzuna.com",
    "jobsearch.com",
    "quora.com",
    "reddit.com",
]

JOB_QUERY_KEYWORDS = [
    " jobs",
    " hiring",
    " careers",
    " job openings",
    " vacancies",
    " job board",
]

LISTICLE_PREFIXES = (
    "top ",
    "best ",
    "list of ",
    "10 ",
    "20 ",
    "25 ",
    "50 ",
    "100 ",
    "101 ",
    "what are the top",
)

JOB_TITLE_KEYWORDS = (
    "developer jobs",
    "engineer jobs",
    "software developer",
    "hiring",
    "job openings",
    "job board",
    "career opportunities",
    "jobs at ",
    "careers at ",
    "looking for a ",
)


def clean_tavily_query(query: str | None) -> str:
    """Clean search prompt to ensure it targets companies instead of job listings."""
    if not query:
        return ""
    cleaned = query
    for word in JOB_QUERY_KEYWORDS:
        cleaned = cleaned.replace(word, " ").replace(word.capitalize(), " ")
    words = cleaned.split()
    if not any(w.lower() in ("companies", "company", "firms", "agencies", "startups") for w in words):
        words.append("companies")
    return " ".join(words)


def extract_clean_company_name(raw_title: str, fallback_domain: str = "") -> str:
    """Extract a clean company name from a web page title."""
    if not raw_title:
        return fallback_domain
    clean_name = raw_title
    for sep in [" - ", " | ", " : ", " – ", " — "]:
        if sep in clean_name:
            parts = [p.strip() for p in clean_name.split(sep)]
            meaningful = [
                p for p in parts
                if p.lower() not in (
                    "home",
                    "about",
                    "about us",
                    "official site",
                    "overview",
                    "services",
                    "homepage",
                    "contact",
                )
            ]
            if meaningful:
                clean_name = meaningful[0]
            break
    return clean_name or fallback_domain


def is_job_or_listicle_result(url: str, title: str) -> bool:
    """Determine whether a search result is a job posting, job portal, listicle, or non-company page."""
    parsed = urlparse(url or "")
    netloc = parsed.netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]

    # Check known job and aggregator domains
    if any(jd in netloc for jd in JOB_AND_AGGREGATOR_DOMAINS):
        return True

    # Check path indicators for job postings
    path_lower = parsed.path.lower()
    if any(job_path in path_lower for job_path in ("/jobs", "/careers", "/job/", "/career/", "/openings")):
        return True

    # Check title indicators
    title_lower = (title or "").lower().strip()
    if any(title_lower.startswith(prefix) for prefix in LISTICLE_PREFIXES):
        return True
    if any(kw in title_lower for kw in JOB_TITLE_KEYWORDS):
        return True

    return False


def filter_and_clean_tavily_results(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Filter out job postings and listicles, returning clean company records."""
    cleaned_companies: List[Dict[str, Any]] = []

    for res in results or []:
        raw_url = res.get("url", "")
        raw_title = res.get("title", "")

        if is_job_or_listicle_result(raw_url, raw_title):
            continue

        parsed = urlparse(raw_url)
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]

        clean_name = extract_clean_company_name(raw_title, fallback_domain=netloc)

        cleaned_companies.append({
            "name": clean_name,
            "domain": netloc,
            "website": raw_url,
            "raw_signals": res,
        })

    return cleaned_companies


async def search_tavily(tavily_prompt_model: TavilyPrompt) -> dict[str, Any]:
    """Search Tavily for target companies using the prompt stored in the LangGraph state."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        raise ValueError("TAVILY_API_KEY is required to search Tavily")

    query = clean_tavily_query(tavily_prompt_model.prompt)

    tavily_client = AsyncTavilyClient(api_key=api_key)
    response = await tavily_client.search(
        query=query,
        search_depth="basic",
        exclude_domains=JOB_AND_AGGREGATOR_DOMAINS,
    )
    return response


