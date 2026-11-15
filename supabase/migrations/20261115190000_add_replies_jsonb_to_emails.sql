-- Add reply_count and replies JSONB columns to emails table to track multiple replies per sent outreach email
ALTER TABLE emails
    ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS replies JSONB DEFAULT '[]'::jsonb;
