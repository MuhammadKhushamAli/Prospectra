-- Migration: 20261116100000_create_org_approval_enums.sql
-- Create enums for org approvals and update invite status enum

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_approval_type') THEN
        CREATE TYPE org_approval_type AS ENUM ('role_change');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_approval_status') THEN
        CREATE TYPE org_approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
    END IF;
END $$;

DO $$
BEGIN
    ALTER TYPE org_invite_status ADD VALUE IF NOT EXISTS 'revoked';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
