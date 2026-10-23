import os
from typing import Any

import httpx

from ..agents.params_generation.pydantic_model import ApolloPrompt


async def find_apollo_companies(apollo_model: ApolloPrompt) -> dict[str, Any]:
    """Find organizations in Apollo using the supplied search filters."""
    api_key = os.getenv("APOLLO_API_KEY")
    api_url = os.getenv("APOLLO_COMPANIES_SEARCH_URL")
    if not api_key:
        raise ValueError("APOLLO_API_KEY is required to search Apollo companies")
    if not api_url:
        raise ValueError("APOLLO_COMPANIES_SEARCH_URL is required to search Apollo companies")

    payload = apollo_model.model_dump(
        exclude_none=True,
    )

    # Apollo free tier blocks 'currently_using_any_of_technology_uids' with HTTP 422.
    # Convert any technology UIDs to keyword tags so free-tier searches succeed.
    if "currently_using_any_of_technology_uids" in payload:
        tech_uids = payload.pop("currently_using_any_of_technology_uids", [])
        if tech_uids:
            existing_tags = payload.get("q_organization_keyword_tags", []) or []
            for uid in tech_uids:
                clean_tag = str(uid).replace("_", " ")
                if clean_tag not in existing_tags:
                    existing_tags.append(clean_tag)
            payload["q_organization_keyword_tags"] = existing_tags[:6]

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            api_url,
            headers={
                "Cache-Control": "no-cache",
                "Content-Type": "application/json",
                "accept": "application/json",
                "x-api-key": api_key,
            },
            json=payload,
        )

        # If Apollo still returns 422 (e.g. other advanced filters restricted on free plan), retry with basic pagination & keyword tags
        if response.status_code == 422:
            safe_payload = {
                "page": payload.get("page", 1),
                "per_page": payload.get("per_page", 10),
            }
            if payload.get("q_organization_keyword_tags"):
                safe_payload["q_organization_keyword_tags"] = payload["q_organization_keyword_tags"]
            if payload.get("organization_locations"):
                safe_payload["organization_locations"] = payload["organization_locations"]

            response = await client.post(
                api_url,
                headers={
                    "Cache-Control": "no-cache",
                    "Content-Type": "application/json",
                    "accept": "application/json",
                    "x-api-key": api_key,
                },
                json=safe_payload,
            )

    response.raise_for_status()
    return response.json()

