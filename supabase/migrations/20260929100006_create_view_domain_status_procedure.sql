-- Procedure: View Domain Status
-- Retrieves domain verification status, DNS records, verified timestamp, and ESP provider

-- Overload 1: View domain status by org_id and domain name
CREATE OR REPLACE PROCEDURE public.view_domain_status(
    p_org_id UUID,
    p_domain TEXT,
    INOUT p_verification_status domain_verification_status DEFAULT NULL,
    INOUT p_dns_records JSONB DEFAULT NULL,
    INOUT p_verified_at TIMESTAMPTZ DEFAULT NULL,
    INOUT p_esp_provider esp_provider DEFAULT NULL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    SELECT verification_status, dns_records, verified_at, esp_provider
    INTO p_verification_status, p_dns_records, p_verified_at, p_esp_provider
    FROM public.domain_verifications
    WHERE org_id = p_org_id
      AND domain = p_domain;
END;
$$;

-- Overload 2: View domain status by domain_id
CREATE OR REPLACE PROCEDURE public.view_domain_status(
    p_domain_id UUID,
    INOUT p_verification_status domain_verification_status DEFAULT NULL,
    INOUT p_dns_records JSONB DEFAULT NULL,
    INOUT p_verified_at TIMESTAMPTZ DEFAULT NULL,
    INOUT p_esp_provider esp_provider DEFAULT NULL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    SELECT verification_status, dns_records, verified_at, esp_provider
    INTO p_verification_status, p_dns_records, p_verified_at, p_esp_provider
    FROM public.domain_verifications
    WHERE id = p_domain_id;
END;
$$;

REVOKE ALL ON PROCEDURE public.view_domain_status(UUID, TEXT, domain_verification_status, JSONB, TIMESTAMPTZ, esp_provider) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.view_domain_status(UUID, TEXT, domain_verification_status, JSONB, TIMESTAMPTZ, esp_provider) TO authenticated;
GRANT EXECUTE ON PROCEDURE public.view_domain_status(UUID, TEXT, domain_verification_status, JSONB, TIMESTAMPTZ, esp_provider) TO service_role;

REVOKE ALL ON PROCEDURE public.view_domain_status(UUID, domain_verification_status, JSONB, TIMESTAMPTZ, esp_provider) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.view_domain_status(UUID, domain_verification_status, JSONB, TIMESTAMPTZ, esp_provider) TO authenticated;
GRANT EXECUTE ON PROCEDURE public.view_domain_status(UUID, domain_verification_status, JSONB, TIMESTAMPTZ, esp_provider) TO service_role;
