import type { CompanyProspect } from "./company";

export type EmailFilter = "all" | "pending" | "rejected";

export interface EmailContent {
  subject: string;
  body: string;
}

export interface Email {
  from_email: string;
  to_email: string;
  email_body: EmailContent;
}

export interface EmailVerification {
  score: number;
  feedback: string;
}

export interface EmailProspect {
  id: string;
  company_id: string;
  org_id?: string;
  sent_by_org_id?: string;
  sent_by_user_id?: string | null;
  user_id?: string | null;

  from_email: string;
  to_email: string;
  email_body: EmailContent;

  subject: string;
  body: string;

  company_name?: string;
  company_domain?: string;
  recipient_email?: string;
  recipient_emails?: string[];
  message_id?: string;
  reply_snippet?: string;
  reply_from?: string;
  reply_subject?: string;
  replied_at?: string;
  sent_at?: string;
  status: "draft" | "approved" | "sent" | "replied" | "rejected";
  created_at?: string;

  verification?: EmailVerification | null;
}

export interface EmailDetailModalProps {
  email: EmailProspect | null;
  visible: boolean;
  onClose: () => void;
  onViewCompany?: (company: CompanyProspect) => void;
  associatedCompany?: CompanyProspect | null;
  onSendEmail?: (
    email: EmailProspect,
    selectedRecipients?: string[],
  ) => void | Promise<void>;
  onRegenerateEmail?: (
    email: EmailProspect,
    feedback?: string,
  ) => void | Promise<void>;
}
