-- Add columns to emails table for SMTP dispatch and IMAP reply detection
ALTER TABLE emails
    ADD COLUMN IF NOT EXISTS recipient_email TEXT,
    ADD COLUMN IF NOT EXISTS recipient_emails JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS message_id TEXT,
    ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reply_snippet TEXT,
    ADD COLUMN IF NOT EXISTS reply_from TEXT,
    ADD COLUMN IF NOT EXISTS reply_subject TEXT;

CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_recipient_email ON emails(recipient_email) WHERE recipient_email IS NOT NULL;

-- Add optional IMAP columns to domain_verifications table for reply detection
ALTER TABLE domain_verifications
    ADD COLUMN IF NOT EXISTS imap_server TEXT,
    ADD COLUMN IF NOT EXISTS imap_port INTEGER DEFAULT 993;
