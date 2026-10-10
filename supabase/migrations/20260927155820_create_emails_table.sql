CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    sent_by_user_id UUID REFERENCES auth.users(id),
    sent_by_org_id UUID REFERENCES organizations(id),
    subject TEXT,
    body TEXT NOT NULL,
    status email_status NOT NULL DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
