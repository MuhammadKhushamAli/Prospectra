CREATE TABLE search_progress_industries (
    search_progress_id UUID NOT NULL REFERENCES search_progress(id) ON DELETE CASCADE,
    industry_id UUID NOT NULL REFERENCES target_industries(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (search_progress_id, industry_id)
);

CREATE INDEX idx_search_progress_industries_industry_id ON search_progress_industries(industry_id);
