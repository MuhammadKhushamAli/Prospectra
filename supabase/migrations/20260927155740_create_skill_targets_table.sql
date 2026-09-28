CREATE TABLE skill_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    target_profile TEXT NOT NULL,
    search_keywords TEXT[] NOT NULL DEFAULT '{}',
    industries_filter TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
