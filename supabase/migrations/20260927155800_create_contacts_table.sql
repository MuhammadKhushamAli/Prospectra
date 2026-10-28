CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT,
    role TEXT,
    email TEXT,
    source TEXT,
    is_reachable TEXT,
    is_role_account BOOLEAN,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_contacts_company_email ON contacts(company_id, lower(email));
