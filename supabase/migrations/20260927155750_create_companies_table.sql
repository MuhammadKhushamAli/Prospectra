CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT,
    website TEXT,
    linkedin_url TEXT,
    industry TEXT,
    size TEXT,
    about_text TEXT,
    need_hypothesis TEXT,
    needed_skills TEXT[] NOT NULL DEFAULT '{}',
    needed_services TEXT[] NOT NULL DEFAULT '{}',
    need_signals TEXT[] NOT NULL DEFAULT '{}',
    proposed_solution TEXT,
    services_offered TEXT[] NOT NULL DEFAULT '{}',
    digital_features TEXT[] NOT NULL DEFAULT '{}',
    auth_score INT,
    auth_feedback TEXT,
    source TEXT[] NOT NULL DEFAULT '{}',
    raw_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
    status company_status NOT NULL DEFAULT 'discovered',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_companies_org_domain UNIQUE (org_id, domain)
);

CREATE INDEX idx_companies_org_status ON companies(org_id, status);
