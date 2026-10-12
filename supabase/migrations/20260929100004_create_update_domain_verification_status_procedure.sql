-- Procedure: Update Domain Verification Status
-- Updates verification status, dns_records, and verified_at in public.domain_verifications

-- Overload 1: Update domain verification status by domain verification ID
CREATE OR REPLACE PROCEDURE public.update_domain_verification_status(
    p_domain_id UUID,
    p_verification_status domain_verification_status,
    p_dns_records JSONB DEFAULT NULL,
    p_verified_at TIMESTAMPTZ DEFAULT NULL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.domain_verifications
    SET
        verification_status = p_verification_status,
        dns_records = COALESCE(p_dns_records, domain_verifications.dns_records),
        verified_at = CASE
            WHEN p_verification_status = 'verified' THEN COALESCE(p_verified_at, now())
            WHEN p_verification_status IN ('pending', 'failed') AND p_verified_at IS NULL THEN NULL
            ELSE COALESCE(p_verified_at, domain_verifications.verified_at)
        END
    WHERE id = p_domain_id;
END;
$$;

-- Overload 2: Update domain verification status by org_id and domain name
CREATE OR REPLACE PROCEDURE public.update_domain_verification_status(
    p_org_id UUID,
    p_domain TEXT,
    p_verification_status domain_verification_status,
    p_dns_records JSONB DEFAULT NULL,
    p_verified_at TIMESTAMPTZ DEFAULT NULL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.domain_verifications
    SET
        verification_status = p_verification_status,
        dns_records = COALESCE(p_dns_records, domain_verifications.dns_records),
        verified_at = CASE
            WHEN p_verification_status = 'verified' THEN COALESCE(p_verified_at, now())
            WHEN p_verification_status IN ('pending', 'failed') AND p_verified_at IS NULL THEN NULL
            ELSE COALESCE(p_verified_at, domain_verifications.verified_at)
        END
    WHERE org_id = p_org_id
      AND domain = p_domain;
END;
$$;

REVOKE ALL ON PROCEDURE public.update_domain_verification_status(UUID, domain_verification_status, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.update_domain_verification_status(UUID, domain_verification_status, JSONB, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON PROCEDURE public.update_domain_verification_status(UUID, domain_verification_status, JSONB, TIMESTAMPTZ) TO service_role;

REVOKE ALL ON PROCEDURE public.update_domain_verification_status(UUID, TEXT, domain_verification_status, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.update_domain_verification_status(UUID, TEXT, domain_verification_status, JSONB, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON PROCEDURE public.update_domain_verification_status(UUID, TEXT, domain_verification_status, JSONB, TIMESTAMPTZ) TO service_role;
