-- Migration: 20261116100300_alter_invites_members_companies.sql
-- Add audit tracking, attribution, and sender email column updates

-- 1. Organization Invites
ALTER TABLE public.organization_invites
    ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_invites_open_email
    ON public.organization_invites(org_id, lower(email))
    WHERE status = 'pending';

-- 2. Organization Members
ALTER TABLE public.organization_members
    ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Companies: Attribution of discoverer/searcher
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS discovered_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_org_discovered_by
    ON public.companies(org_id, discovered_by_user_id);

-- 4. Emails: Track sender_email recorded at send time
ALTER TABLE public.emails
    ADD COLUMN IF NOT EXISTS sender_email TEXT;

-- 5. Domain Verifications: Sender email is moved to user_profiles.email
ALTER TABLE public.domain_verifications
    DROP COLUMN IF EXISTS sender_email;
