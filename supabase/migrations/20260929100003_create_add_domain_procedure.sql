-- Procedure: Add Domain
-- Adds or updates a domain verification record in public.domain_verifications table

CREATE OR REPLACE PROCEDURE public.add_domain(
    p_org_id UUID,
    p_domain TEXT,
    p_esp_provider esp_provider,
    p_dns_records JSONB DEFAULT '{}'::jsonb,
    p_verification_status domain_verification_status DEFAULT 'pending'::domain_verification_status,
    p_verified_at TIMESTAMPTZ DEFAULT NULL,
    INOUT p_domain_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.domain_verifications (
        org_id,
        domain,
        esp_provider,
        dns_records,
        verification_status,
        verified_at
    )
    VALUES (
        p_org_id,
        p_domain,
        p_esp_provider,
        COALESCE(p_dns_records, '{}'::jsonb),
        COALESCE(p_verification_status, 'pending'::domain_verification_status),
        p_verified_at
    )
    ON CONFLICT (org_id, domain) DO UPDATE SET
        esp_provider = EXCLUDED.esp_provider,
        dns_records = EXCLUDED.dns_records,
        verification_status = EXCLUDED.verification_status,
        verified_at = EXCLUDED.verified_at
    RETURNING id INTO p_domain_id;
END;
$$;

REVOKE ALL ON PROCEDURE public.add_domain(UUID, TEXT, esp_provider, JSONB, domain_verification_status, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.add_domain(UUID, TEXT, esp_provider, JSONB, domain_verification_status, TIMESTAMPTZ, UUID) TO authenticated;
GRANT EXECUTE ON PROCEDURE public.add_domain(UUID, TEXT, esp_provider, JSONB, domain_verification_status, TIMESTAMPTZ, UUID) TO service_role;
