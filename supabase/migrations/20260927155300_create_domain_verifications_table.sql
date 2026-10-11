CREATE TABLE domain_verifications (
    org_id UUID PRIMARY KEY NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    dns_records JSONB NOT NULL DEFAULT '{}'::jsonb,
    verification_status domain_verification_status NOT NULL DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, domain)
);
