CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT,
    website TEXT,
    linkedin_url TEXT,
    industry TEXT,
    size TEXT,
    source TEXT[] NOT NULL DEFAULT '{}',
    raw_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
    status company_status NOT NULL DEFAULT 'discovered',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, linkedin_url),
    UNIQUE (org_id, domain)
);

CREATE INDEX idx_companies_org_status ON companies(org_id, status);
