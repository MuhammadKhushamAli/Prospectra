CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type event_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
