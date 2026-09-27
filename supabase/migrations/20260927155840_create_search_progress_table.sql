CREATE TABLE search_progress (
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    skill_target_id UUID NOT NULL REFERENCES skill_targets(id) ON DELETE CASCADE,
    last_page_fetched INT NOT NULL DEFAULT 0,
    last_fetched_at TIMESTAMPTZ,
    PRIMARY KEY (org_id, skill_target_id)
);
