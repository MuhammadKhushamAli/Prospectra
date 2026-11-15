"""RFC 8601 Authentication-Results header generation and validation helpers."""

from __future__ import annotations

import authres
import authres.dmarc

from app.utils.constants.email_constants import VALID_SPF_RESULTS


def _build_authres_header(
    authserv_id: str,
    sender_email: str,
    domain: str,
    spf_result: str,
    dkim_valid: bool,
    dkim_selector: str | None,
    dmarc_valid: bool,
) -> str:
    """Build and round-trip validate an RFC 8601 Authentication-Results header via authres."""
    normalized_spf = (
        spf_result
        if spf_result in VALID_SPF_RESULTS
        else ("pass" if spf_result else "none")
    )
    spf_auth = authres.SPFAuthenticationResult(
        result=normalized_spf,
        smtp_mailfrom=sender_email,
    )
    dkim_auth = authres.DKIMAuthenticationResult(
        result="pass" if dkim_valid else "none",
        header_d=domain,
        header_s=dkim_selector or "default",
    )
    dmarc_auth = authres.dmarc.DMARCAuthenticationResult(
        result="pass" if dmarc_valid else "none",
        header_from=domain,
    )
    header_obj = authres.AuthenticationResultsHeader(
        authserv_id=authserv_id,
        results=[spf_auth, dkim_auth, dmarc_auth],
    )
    serialized = str(header_obj)
    _ = authres.all_features().parse(serialized)
    return serialized
