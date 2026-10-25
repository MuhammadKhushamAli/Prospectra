CREATE TABLE user_target_industries (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_industry_id UUID NOT NULL REFERENCES target_industries(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, target_industry_id)
);
