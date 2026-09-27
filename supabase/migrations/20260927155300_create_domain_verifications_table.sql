CREATE TABLE domain_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    esp_provider esp_provider NOT NULL,
    dns_records JSONB NOT NULL DEFAULT '{}'::jsonb,
    verification_status domain_verification_status NOT NULL DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, domain)
);
