CREATE TABLE search_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    last_page_fetched INT NOT NULL DEFAULT 0,
    last_fetched_at TIMESTAMPTZ,
    source search_progress_source NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_progress_org_source ON search_progress(org_id, source);
