/**
 * Constants for Prospecting screen, filtering, and tab definitions.
 */

export const PROSPECTING_TABS = {
  COMPANIES: "companies",
  EMAILS: "emails",
} as const;

export const COMPANY_FILTERS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const EMAIL_FILTERS = {
  PENDING: "pending",
  SENDING: "sending",
  SENT: "sent",
} as const;

export const PROSPECTING_COPY = {
  TITLE: "Prospecting",
  SUBTITLE: "Target candidate discovery & AI outreach generation",
  COMPANIES_TAB_LABEL: "Companies",
  EMAILS_TAB_LABEL: "Emails",
  FIND_COMPANIES_ACTION: "Find Companies",
  FINDING_COMPANIES_STATUS: "Discovering Companies...",
  NO_COMPANIES_TITLE: "No companies found",
  NO_COMPANIES_PENDING_SUBTITLE: "No pending candidate companies. Tap 'Find Companies' to discover new prospects.",
  NO_COMPANIES_APPROVED_SUBTITLE: "No approved companies yet. Review and accept candidates from the Pending tab.",
  NO_COMPANIES_REJECTED_SUBTITLE: "No rejected companies.",
  NO_EMAILS_TITLE: "No emails in this queue",
  NO_EMAILS_PENDING_SUBTITLE: "No pending drafts. Accept candidate companies to generate personalized outreach emails.",
  NO_EMAILS_SENT_SUBTITLE: "No sent emails yet. Approve drafts to send them to prospects.",
  NO_EMAILS_REPLIED_SUBTITLE: "No replies detected yet. Prospects replies will appear here once received.",
  IMMUTABLE_ACCEPTED_MSG: "has already been accepted and cannot be changed.",
  IMMUTABLE_REJECTED_MSG: "is rejected and cannot be accepted.",
} as const;

export const PROSPECTING_TIMERS = {
  NOTIFICATION_DURATION_MS: 4500,
  POLL_INTERVAL_MS: 3000,
} as const;
