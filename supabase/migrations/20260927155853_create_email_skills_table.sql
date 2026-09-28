CREATE TABLE email_skills (
    email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (email_id, skill_id)
);

CREATE INDEX idx_email_skills_skill_id ON email_skills(skill_id);
