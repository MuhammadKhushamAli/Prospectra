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
  onSendEmail?: (email: EmailProspect) => void | Promise<void>;
  onRegenerateEmail?: (email: EmailProspect) => void | Promise<void>;
}
