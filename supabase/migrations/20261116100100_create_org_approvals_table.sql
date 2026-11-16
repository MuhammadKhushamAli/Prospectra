-- Migration: 20261116100100_create_org_approvals_table.sql
-- Create table for organization approval requests (e.g. promoting member to founder)

CREATE TABLE IF NOT EXISTS public.org_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    request_type org_approval_type NOT NULL DEFAULT 'role_change',
    status org_approval_status NOT NULL DEFAULT 'pending',
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_email TEXT,
    from_role org_role NOT NULL DEFAULT 'member',
    to_role org_role NOT NULL DEFAULT 'founder',
    decided_by UUID REFERENCES auth.users(id),
    decided_at TIMESTAMPTZ,
    decision_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_approvals_org_status
    ON public.org_approvals(org_id, status);

CREATE INDEX IF NOT EXISTS idx_org_approvals_requested_by
    ON public.org_approvals(requested_by);

-- Ensure only one pending approval request exists per target user in an org
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_approvals_pending_target
    ON public.org_approvals(org_id, target_user_id)
    WHERE status = 'pending';
