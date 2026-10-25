CREATE TABLE user_profiles (
    org_id UUID NOT NULL,
    user_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    headline TEXT NOT NULL,
    email TEXT NOT NULL,
    github_url TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, user_id),
    FOREIGN KEY (org_id, user_id)
        REFERENCES organization_members(org_id, user_id)
        ON DELETE CASCADE
);
