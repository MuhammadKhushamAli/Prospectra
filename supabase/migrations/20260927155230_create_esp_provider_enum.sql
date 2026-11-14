CREATE TYPE esp_provider AS ENUM (
    'google_workspace',
    'microsoft_365',
    'zoho',
    'hostinger',
    'amazon_ses',
    'sendgrid',
    'mailgun',
    'postmark',
    'resend',
    'other',
    'custom_smtp',
    'google'
);

CREATE TABLE IF NOT EXISTS esp_providers (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL UNIQUE,
    smtp_server TEXT NOT NULL DEFAULT '',
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_used TEXT NOT NULL DEFAULT 'STARTTLS',
    default_dkim_selectors TEXT[] NOT NULL DEFAULT ARRAY['default'],
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO esp_providers (id, label, smtp_server, smtp_port, smtp_used, default_dkim_selectors, is_custom)
VALUES
    ('google_workspace', 'Google Workspace', 'smtp.gmail.com', 587, 'STARTTLS', ARRAY['google', 'default', '20230601'], FALSE),
    ('microsoft_365', 'Microsoft 365', 'smtp.office365.com', 587, 'STARTTLS', ARRAY['selector1', 'selector2'], FALSE),
    ('zoho', 'Zoho Mail', 'smtp.zoho.com', 587, 'STARTTLS', ARRAY['zoho', 'zmail', 'default'], FALSE),
    ('hostinger', 'Hostinger', 'smtp.hostinger.com', 465, 'SSL/TLS', ARRAY['hostingermail-a', 'hostingermail-b', 'hostingermail-c', 'default'], FALSE),
    ('amazon_ses', 'Amazon SES', 'email-smtp.us-east-1.amazonaws.com', 587, 'STARTTLS', ARRAY['default', 'ses'], FALSE),
    ('sendgrid', 'SendGrid', 'smtp.sendgrid.net', 587, 'STARTTLS', ARRAY['s1', 's2', 'smtpapi'], FALSE),
    ('mailgun', 'Mailgun', 'smtp.mailgun.org', 587, 'STARTTLS', ARRAY['krs', 'pic', 'smtp', 'mailo', 'mx'], FALSE),
    ('postmark', 'Postmark', 'smtp.postmarkapp.com', 587, 'STARTTLS', ARRAY['pm', 'default'], FALSE),
    ('resend', 'Resend', 'smtp.resend.com', 587, 'STARTTLS', ARRAY['resend', 'default'], FALSE)
ON CONFLICT (id) DO NOTHING;
