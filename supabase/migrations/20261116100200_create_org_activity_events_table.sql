-- Migration: 20261116100200_create_org_activity_events_table.sql
-- Create table for append-only organization admin activity feed and realtime stream

CREATE TABLE IF NOT EXISTS public.org_activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_email TEXT,
    event TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_activity_events_org_created
    ON public.org_activity_events(org_id, created_at DESC);
