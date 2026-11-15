"""MX record resolution helpers using dnspython."""

from __future__ import annotations

import dns.asyncresolver
import dns.exception

from app.domain.verification.helpers.dns_helpers import create_async_dns_resolver
from app.utils.constants.dns_constants import _DNS_LIFETIME_SECONDS

_default_resolver = create_async_dns_resolver()


async def _check_mx_with_dnspython(
    domain: str,
    dns_resolver: dns.asyncresolver.Resolver | None = None,
) -> tuple[bool, list[str], list[str]]:
    """Query MX records for a domain using dnspython asyncresolver."""
    active_resolver = dns_resolver or _default_resolver
    mx_hosts: list[str] = []
    warnings: list[str] = []
    try:
        answers = await active_resolver.resolve(domain, "MX", lifetime=_DNS_LIFETIME_SECONDS)
        sorted_mx = sorted(
            answers,
            key=lambda r: getattr(r, "preference", 100),
        )
        for rdata in sorted_mx:
            exchange = str(getattr(rdata, "exchange", "")).rstrip(".").lower()
            if exchange and exchange != ".":
                mx_hosts.append(exchange)
    except dns.exception.DNSException as exc:
        warnings.append(f"No MX records resolved via dnspython: {exc.__class__.__name__}")
    return bool(mx_hosts), mx_hosts, warnings
