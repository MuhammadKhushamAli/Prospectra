-- Migration: 20261116100400_org_admin_rls_and_realtime.sql
-- RLS policies and Realtime publications for Organization Admin & Approvals

-- Helper function to check if user is a founder or owner of an org
CREATE OR REPLACE FUNCTION public.is_org_founder(
    p_org_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organizations
        WHERE id = p_org_id
          AND owner_id = p_user_id
    ) OR EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE org_id = p_org_id
          AND user_id = p_user_id
          AND role = 'founder'::org_role
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_founder(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_founder(UUID, UUID) TO service_role;

-- 1. RLS on org_approvals
ALTER TABLE public.org_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view org approvals, requesters can view their own"
    ON public.org_approvals
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = (SELECT owner_id FROM public.organizations WHERE id = org_id)
        OR requested_by = auth.uid()
    );

-- 2. RLS on org_activity_events
ALTER TABLE public.org_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can view org activity events"
    ON public.org_activity_events
    FOR SELECT
    TO authenticated
    USING (
        public.is_org_founder(org_id, auth.uid())
    );

-- 3. RLS on organization_invites
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can view organization invites"
    ON public.organization_invites
    FOR SELECT
    TO authenticated
    USING (
        public.is_org_founder(org_id, auth.uid())
    );

-- 4. Enable Realtime Publications
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.org_approvals;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.org_activity_events;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_invites;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_members;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
