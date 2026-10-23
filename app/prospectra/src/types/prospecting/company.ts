import type { EmailProspect } from "./email";

export type CompanyFilter = "all" | "pending" | "rejected";

export interface CompanyAuth {
  score: number;
  feedback?: string | null;
}

export interface CompanyEmail {
  email: string;
  email_of: string;
  is_verified?: boolean;
  first_name?: string | null;
  last_name?: string | null;
}

export interface Company {
  id: string;
  org_id: string;
  user_id?: string | null;
  name: string;
  domain: string;
  industry: string;
  size: string;
  source: string;
  website?: string | null;
  linkedin_url?: string | null;
  raw_signals?: Record<string, any> | null;
  status:
    | "active"
    | "inactive"
    | "discovered"
    | "enriched"
    | "pending_review"
    | "approved"
    | "email_drafted"
    | "pending_send_approval"
    | "sent"
    | "replied"
    | "rejected";
  created_at?: string;
  company_auth?: CompanyAuth | null;
  emails?: CompanyEmail[];
}

export type CompanyProspect = Company;

export interface CompanyDetailModalProps {
  company: CompanyProspect | null;
  visible: boolean;
  onClose: () => void;
  onViewEmail?: (email: EmailProspect) => void;
  associatedEmail?: EmailProspect | null;
  onAcceptCompany?: (company: CompanyProspect) => void | Promise<void>;
  onRejectCompany?: (company: CompanyProspect) => void | Promise<void>;
}
