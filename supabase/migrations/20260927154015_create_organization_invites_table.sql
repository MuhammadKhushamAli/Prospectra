CREATE TABLE organization_invites	(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role org_role DEFAULT 'member',
    token TEXT NOT NULL UNIQUE,
    status org_invite_status NOT NULL DEFAULT 'pending',
    invite_by UUID NOT NULL REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);