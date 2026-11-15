"""DKIM public key resolution and cryptographic validation helpers using dnspython and dkimpy."""

from __future__ import annotations

import dkim
import dkim.crypto
import dns.asyncresolver
import dns.exception

from app.domain.verification.helpers.dns_helpers import create_async_dns_resolver

_default_resolver = create_async_dns_resolver()


def build_dkim_selector_candidates(
    dkim_selector: str | None,
    candidate_selectors: tuple[str, ...],
) -> list[str]:
    """Build ordered list of DKIM selectors to probe."""
    selectors_to_try: list[str] = []
    if dkim_selector and dkim_selector.strip():
        selectors_to_try.append(dkim_selector.strip().lower())
    for candidate in candidate_selectors:
        if candidate not in selectors_to_try:
            selectors_to_try.append(candidate)
    return selectors_to_try


def validate_dkim_txt_record(
    selector: str,
    txt_value: str,
    warnings: list[str],
) -> bool:
    """Parse and validate a DKIM TXT record's public key using dkimpy primitives."""
    if "p=" not in txt_value:
        return False

    try:
        parsed_tags = dkim.util.parse_tag_value(txt_value.encode("utf-8"))
        pub_key_b64 = parsed_tags.get(b"p", b"")
        if not pub_key_b64:
            warnings.append(f"DKIM selector '{selector}' has an empty public key (revoked).")
            return False
        key_type = parsed_tags.get(b"k", b"rsa")
        if key_type == b"rsa":
            dkim.crypto.parse_public_key(pub_key_b64)
        return True
    except Exception as exc:
        warnings.append(f"DKIM key parse warning on selector '{selector}': {exc}")
        return True


async def _check_dkim_with_dkimpy(
    domain: str,
    dkim_selector: str | None,
    candidate_selectors: tuple[str, ...],
    dns_resolver: dns.asyncresolver.Resolver | None = None,
) -> tuple[bool, str | None, str | None, list[str]]:
    """Locate and cryptographically validate a domain's DKIM public key using dnspython + dkimpy."""
    active_resolver = dns_resolver or _default_resolver
    selectors_to_try = build_dkim_selector_candidates(dkim_selector, candidate_selectors)
    warnings: list[str] = []

    for selector in selectors_to_try:
        dkim_domain = f"{selector}._domainkey.{domain}"
        try:
            answers = await active_resolver.resolve(dkim_domain, "TXT", lifetime=4.0)
        except dns.exception.DNSException:
            continue

        for record in answers:
            txt_value = b"".join(record.strings).decode("utf-8", errors="ignore").strip()
            if validate_dkim_txt_record(selector, txt_value, warnings):
                return True, selector, txt_value, warnings

    return False, dkim_selector, None, warnings
