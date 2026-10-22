export type ProspectingTab = "companies" | "emails";

export type CompanyFilter = "all" | "pending" | "rejected";

export type EmailFilter = "all" | "pending" | "rejected";

export type ProspectingRole = "founder" | "member";

/**
 * Pydantic Model from backend/app/agents/email_writer_agent/pydantic_model/email_model.py
 * The agent produces only the subject and body.
 */
export interface EmailContent {
  subject: string;
  body: string;
}

/**
 * Pydantic Model from backend/app/agents/email_writer_agent/pydantic_model/email_model.py
 * Combines the LLM-generated content (subject, body) with the
 * user-chosen sender and recipient addresses.
 */
export interface Email {
  from_email: string;
  to_email: string;
  email_body: EmailContent;
}

/**
 * Pydantic Model from backend/app/agents/email_verifier_agent/pydantic_model/email_verifier.py
 * LLM-generated email verification scoring and feedback.
 */
export interface EmailVerification {
  score: number;
  feedback: string;
}

/**
 * Pydantic Model from backend/app/agents/company_authenticator/pydantic_model/company_auth.py
 * Company authenticity score with conditional feedback.
 */
export interface CompanyAuth {
  score: number;
  feedback?: string | null;
}

/**
 * Company Email Model from backend/app/models/company.py
 * An email associated with a target company.
 */
export interface CompanyEmail {
  email: string;
  email_of: string;
  is_verified?: boolean;
  first_name?: string | null;
  last_name?: string | null;
}

/**
 * Information about a target company matching backend/app/models/company.py
 * and backend/app/agents/company_authenticator/pydantic_model/company_auth.py
 */
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

/**
 * Outreach Prospect combining Email and EmailVerification agent models with relational metadata
 */
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

export interface ProspectingData {
  companies: CompanyProspect[];
  emails: EmailProspect[];
  role: ProspectingRole;
  currentUserId: string | null;
  orgId: string | null;
  orgName?: string | null;
}
