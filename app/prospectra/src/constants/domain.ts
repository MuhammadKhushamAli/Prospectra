export const domainVerificationStatuses = [
  "pending",
  "verified",
  "failed",
] as const;

export const espProviders = [
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
] as const;

export interface EmailProviderPresetOption {
  id: string;
  label: string;
  smtpServer: string;
  smtpPort: number;
  defaultDkimSelector: string;
  isCustom?: boolean;
}

export const emailProviderPresets: readonly EmailProviderPresetOption[] = [
  {
    id: "google_workspace",
    label: "Google Workspace",
    smtpServer: "smtp.gmail.com",
    smtpPort: 587,
    defaultDkimSelector: "google",
  },
  {
    id: "microsoft_365",
    label: "Microsoft 365",
    smtpServer: "smtp.office365.com",
    smtpPort: 587,
    defaultDkimSelector: "selector1",
  },
  {
    id: "zoho",
    label: "Zoho Mail",
    smtpServer: "smtp.zoho.com",
    smtpPort: 587,
    defaultDkimSelector: "zoho",
  },
  {
    id: "hostinger",
    label: "Hostinger",
    smtpServer: "smtp.hostinger.com",
    smtpPort: 465,
    defaultDkimSelector: "hostingermail-a",
  },
  {
    id: "amazon_ses",
    label: "Amazon SES",
    smtpServer: "email-smtp.us-east-1.amazonaws.com",
    smtpPort: 587,
    defaultDkimSelector: "default",
  },
  {
    id: "sendgrid",
    label: "SendGrid",
    smtpServer: "smtp.sendgrid.net",
    smtpPort: 587,
    defaultDkimSelector: "s1",
  },
  {
    id: "mailgun",
    label: "Mailgun",
    smtpServer: "smtp.mailgun.org",
    smtpPort: 587,
    defaultDkimSelector: "krs",
  },
  {
    id: "postmark",
    label: "Postmark",
    smtpServer: "smtp.postmarkapp.com",
    smtpPort: 587,
    defaultDkimSelector: "pm",
  },
  {
    id: "resend",
    label: "Resend",
    smtpServer: "smtp.resend.com",
    smtpPort: 587,
    defaultDkimSelector: "resend",
  },
  {
    id: "other",
    label: "Other",
    smtpServer: "",
    smtpPort: 587,
    defaultDkimSelector: "default",
  },
] as const;
