CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    headline TEXT,
    calendly_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
