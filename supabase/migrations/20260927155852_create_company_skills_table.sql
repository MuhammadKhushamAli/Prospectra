CREATE TABLE company_skills (
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, skill_id)
);

CREATE INDEX idx_company_skills_skill_id ON company_skills(skill_id);
