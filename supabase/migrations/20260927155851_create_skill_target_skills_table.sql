CREATE TABLE skill_target_skills (
    skill_target_id UUID NOT NULL REFERENCES skill_targets(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (skill_target_id, skill_id)
);

CREATE INDEX idx_skill_target_skills_skill_id ON skill_target_skills(skill_id);
