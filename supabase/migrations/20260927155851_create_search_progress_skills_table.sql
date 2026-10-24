CREATE TABLE search_progress_skills (
    search_progress_id UUID NOT NULL REFERENCES search_progress(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (search_progress_id, skill_id)
);

CREATE INDEX idx_search_progress_skills_skill_id ON search_progress_skills(skill_id);
