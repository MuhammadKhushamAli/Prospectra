"""Email provider presets, SMTP/IMAP constants, and email workflow status messages."""

from __future__ import annotations

from dataclasses import dataclass

VALID_SMTP_SECURITY_MODES = ("STARTTLS", "SSL/TLS", "PLAIN")
DEFAULT_SMTP_PORT = 587
DEFAULT_SSL_SMTP_PORT = 465
DEFAULT_IMAP_PORT = 993
DEFAULT_EMAIL_SUBJECT = "Outreach Inquiry"
DEFAULT_MESSAGE_ID_DOMAIN = "prospectra.ai"

EMAIL_REVIEW_MIN_SCORE = 70
EMAIL_MAX_RETRY_ATTEMPTS = 3

ALREADY_SENT_ERROR = "Email has already been sent and cannot be regenerated."
ALREADY_GENERATED_ERROR = "Email has already been generated for this company and agent cannot be triggered again."
REJECTED_COMPANY_ERROR = "Company has been rejected and email generation is not allowed."

VALID_SPF_RESULTS: frozenset[str] = frozenset(
    {
        "none",
        "pass",
        "fail",
        "softfail",
        "policy",
        "neutral",
        "temperror",
        "permerror",
    }
)

# Standard IMAP configurations mapped from known ESP providers
DEFAULT_IMAP_SERVERS: dict[str, tuple[str, int]] = {
    "google_workspace": ("imap.gmail.com", 993),
    "microsoft_365": ("outlook.office365.com", 993),
    "zoho": ("imap.zoho.com", 993),
    "hostinger": ("imap.hostinger.com", 993),
}


@dataclass(frozen=True, slots=True)
class EmailProviderPreset:
    """Standard SMTP and DNS configuration preset for an email service provider."""

    id: str
    label: str
    smtp_server: str
    smtp_port: int
    smtp_used: str  # "STARTTLS" | "SSL/TLS" | "PLAIN"
    default_dkim_selectors: tuple[str, ...]
    expected_mx_Keywords: tuple[str, ...]
    expected_spf_includes: tuple[str, ...]


EMAIL_PROVIDER_PRESETS: dict[str, EmailProviderPreset] = {
    "google_workspace": EmailProviderPreset(
        id="google_workspace",
        label="Google Workspace (Gmail Business)",
        smtp_server="smtp.gmail.com",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("google", "default", "20230601"),
        expected_mx_Keywords=("google.com", "googlemail.com", "aspmx.l.google.com"),
        expected_spf_includes=("_spf.google.com", "google.com"),
    ),
    "microsoft_365": EmailProviderPreset(
        id="microsoft_365",
        label="Microsoft 365 (Exchange Online)",
        smtp_server="smtp.office365.com",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("selector1", "selector2"),
        expected_mx_Keywords=("outlook.com", "protection.outlook.com"),
        expected_spf_includes=("spf.protection.outlook.com", "outlook.com"),
    ),
    "zoho": EmailProviderPreset(
        id="zoho",
        label="Zoho Mail Workplace",
        smtp_server="smtp.zoho.com",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("zoho", "zmail", "default"),
        expected_mx_Keywords=("zoho.com", "zoho.eu", "zoho.in", "zohomail.com"),
        expected_spf_includes=("zoho.com", "zohomail.com", "zcsend.net"),
    ),
    "hostinger": EmailProviderPreset(
        id="hostinger",
        label="Hostinger Email",
        smtp_server="smtp.hostinger.com",
        smtp_port=465,
        smtp_used="SSL/TLS",
        default_dkim_selectors=("hostingermail-a", "hostingermail-b", "hostingermail-c", "default"),
        expected_mx_Keywords=("mx1.hostinger.com", "mx2.hostinger.com", "hostinger.com"),
        expected_spf_includes=("_spf.mail.hostinger.com", "hostinger.com"),
    ),
    "amazon_ses": EmailProviderPreset(
        id="amazon_ses",
        label="Amazon SES",
        smtp_server="email-smtp.us-east-1.amazonaws.com",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("default", "ses"),
        expected_mx_Keywords=("amazonaws.com", "amazonses.com"),
        expected_spf_includes=("amazonses.com",),
    ),
    "sendgrid": EmailProviderPreset(
        id="sendgrid",
        label="Twilio SendGrid",
        smtp_server="smtp.sendgrid.net",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("s1", "s2", "smtpapi"),
        expected_mx_Keywords=("sendgrid.net",),
        expected_spf_includes=("sendgrid.net",),
    ),
    "mailgun": EmailProviderPreset(
        id="mailgun",
        label="Mailgun",
        smtp_server="smtp.mailgun.org",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("krs", "pic", "smtp", "mailo", "mx"),
        expected_mx_Keywords=("mailgun.org",),
        expected_spf_includes=("mailgun.org",),
    ),
    "postmark": EmailProviderPreset(
        id="postmark",
        label="Postmark",
        smtp_server="smtp.postmarkapp.com",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("pm", "default"),
        expected_mx_Keywords=("postmarkapp.com", "mtasv.net"),
        expected_spf_includes=("spf.mtasv.net",),
    ),
    "resend": EmailProviderPreset(
        id="resend",
        label="Resend",
        smtp_server="smtp.resend.com",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("resend", "default"),
        expected_mx_Keywords=("resend.com", "amazonaws.com"),
        expected_spf_includes=("amazonses.com", "resend.com"),
    ),
    "other": EmailProviderPreset(
        id="other",
        label="Other",
        smtp_server="",
        smtp_port=587,
        smtp_used="STARTTLS",
        default_dkim_selectors=("default", "mail", "dkim", "selector1", "google"),
        expected_mx_Keywords=(),
        expected_spf_includes=(),
    ),
}

BUILTIN_ESP_ENUM_VALUES: frozenset[str] = frozenset(
    {
        "google_workspace",
        "microsoft_365",
        "zoho",
        "hostinger",
        "amazon_ses",
        "sendgrid",
        "mailgun",
        "postmark",
        "resend",
        "other",
        "custom_smtp",
        "google",
    }
)
