/**
 * Constants for Email Verification and SMTP authentication screen.
 */

export const EMAIL_VERIFICATION_COPY = {
  TITLE: "Sender Email Setup",
  SUBTITLE: "Authenticate your corporate email address to send verified outreach directly from your inbox.",
  SENDER_NAME_LABEL: "Sender Display Name",
  SENDER_NAME_PLACEHOLDER: "e.g. Alex Morgan",
  SENDER_EMAIL_LABEL: "Sender Email Address",
  SENDER_EMAIL_PLACEHOLDER: "alex@company.com",
  SMTP_HOST_LABEL: "SMTP Server Host",
  SMTP_HOST_PLACEHOLDER: "smtp.company.com",
  SMTP_PORT_LABEL: "SMTP Port",
  SMTP_PORT_PLACEHOLDER: "587",
  SMTP_USER_LABEL: "SMTP Username",
  SMTP_USER_PLACEHOLDER: "alex@company.com",
  SMTP_PASS_LABEL: "SMTP Password / App Password",
  SMTP_PASS_PLACEHOLDER: "••••••••••••",
  VERIFY_BUTTON: "Test & Verify Connection",
  SUCCESS_BANNER: "Sender email verified and ready for outreach!",
} as const;

export const DEFAULT_SMTP_PORTS = [587, 465, 25, 2525] as const;
