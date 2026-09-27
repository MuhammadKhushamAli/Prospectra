CREATE TABLE enrichment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    summary TEXT,
    recent_news TEXT,
    personalization_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
