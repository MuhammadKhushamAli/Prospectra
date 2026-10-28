"""Service client for self-hosted Reacher email verification."""

from dataclasses import dataclass
import os
from typing import Any, Dict, Optional
import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_random_exponential

REACHER_BASE_URL = os.environ.get("REACHER_BASE_URL", "http://localhost:8080").rstrip("/")
REACHER_SECRET = os.environ.get("REACHER_SECRET", "")
REACHER_TIMEOUT = float(os.environ.get("REACHER_TIMEOUT_SECONDS", "45"))
REACHER_ACCEPT_RISKY_DEFAULT = os.environ.get("REACHER_ACCEPT_RISKY", "false").lower() == "true"
REACHER_ACCEPT_UNKNOWN_IF_MX_VALID = os.environ.get("REACHER_ACCEPT_UNKNOWN_IF_MX_VALID", "true").lower() == "true"


@dataclass
class ReacherResult:
    """Parsed response from Reacher email verification."""
    email: str
    is_reachable: str  # 'safe' | 'risky' | 'invalid' | 'unknown'
    is_catch_all: Optional[bool] = None
    is_role_account: Optional[bool] = None
    is_disposable: Optional[bool] = None
    accepts_mail: Optional[bool] = None
    raw: Optional[Dict[str, Any]] = None


def is_acceptable_email(
    result: ReacherResult,
    accept_risky: Optional[bool] = None,
    accept_unknown_if_mx: Optional[bool] = None,
) -> bool:
    """Determine whether a Reacher email verification result qualifies as reachable.

    Handles:
    - 'safe': verified deliverable via SMTP handshake.
    - 'risky' + catch-all: deliverable if accept_risky is enabled.
    - 'unknown' + accepts_mail: valid syntax & MX mail records found, but direct SMTP handshake
      timed out or was blocked (e.g., residential ISP / hosting provider blocking outbound port 25).
    """
    if result.is_disposable:
        return False

    if result.is_reachable == "safe":
        return True

    should_accept_risky = (
        accept_risky if accept_risky is not None else REACHER_ACCEPT_RISKY_DEFAULT
    )
    if should_accept_risky and result.is_reachable == "risky" and result.is_catch_all:
        return True

    should_accept_unknown_mx = (
        accept_unknown_if_mx if accept_unknown_if_mx is not None else REACHER_ACCEPT_UNKNOWN_IF_MX_VALID
    )
    if should_accept_unknown_mx and result.is_reachable == "unknown" and result.accepts_mail:
        return True

    return False


@retry(
    stop=stop_after_attempt(2),
    wait=wait_random_exponential(min=1, max=6),
    retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
    reraise=True,
)
async def check_email_reacher(
    client: httpx.AsyncClient,
    email: str,
    timeout: Optional[float] = None,
) -> ReacherResult:
    """Query self-hosted Reacher to verify a single email address."""
    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if REACHER_SECRET:
        headers["x-reacher-secret"] = REACHER_SECRET

    request_timeout = timeout or REACHER_TIMEOUT

    response = await client.post(
        f"{REACHER_BASE_URL}/v0/check_email",
        json={"to_email": email},
        headers=headers,
        timeout=request_timeout,
    )
    response.raise_for_status()
    data = response.json()

    is_reachable = data.get("is_reachable", "unknown")
    smtp_info = data.get("smtp") or {}
    misc_info = data.get("misc") or {}
    mx_info = data.get("mx") or {}

    return ReacherResult(
        email=email,
        is_reachable=is_reachable,
        is_catch_all=smtp_info.get("is_catch_all"),
        is_role_account=misc_info.get("is_role_account"),
        is_disposable=misc_info.get("is_disposable"),
        accepts_mail=mx_info.get("accepts_mail"),
        raw=data,
    )


async def check_reacher_health(client: httpx.AsyncClient) -> bool:
    """Quick check to confirm Reacher container connectivity."""
    try:
        res = await client.get(f"{REACHER_BASE_URL}/v0/check_email", timeout=5.0)
        # Even a 405 Method Not Allowed confirms service is up and listening
        return res.status_code in (200, 400, 405)
    except Exception:
        return False
