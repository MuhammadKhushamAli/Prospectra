"""FastAPI route dependencies for Bearer token extraction and ActorContext resolution."""

from __future__ import annotations

from fastapi import Depends, Header, HTTPException

from app.organization.actor import resolve_actor_context
from app.organization.models import ActorContext


async def get_bearer_token(
    authorization: str | None = Header(None, alias="Authorization"),
) -> str:
    """Extract Bearer token from standard Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header. Expected 'Bearer <token>'.",
        )
    parts = authorization.strip().split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    if len(parts) == 1:
        return parts[0]
    raise HTTPException(
        status_code=401,
        detail="Invalid Authorization header format. Expected 'Bearer <token>'.",
    )


async def get_actor(
    org_id: str,
    token: str = Depends(get_bearer_token),
) -> ActorContext:
    """Resolve ActorContext for the specified organization using Bearer token."""
    return await resolve_actor_context(token=token, org_id=org_id)


__all__ = ["get_actor", "get_bearer_token"]
