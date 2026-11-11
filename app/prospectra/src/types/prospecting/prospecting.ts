import type { CompanyProspect } from "./company";
import type { EmailProspect } from "./email";

export type ProspectingTab = "companies" | "emails";

export type ProspectingRole = "founder" | "member";

export interface ProspectingData {
  companies: CompanyProspect[];
  emails: EmailProspect[];
  role: ProspectingRole;
  currentUserId: string | null;
  orgId: string | null;
  orgName?: string | null;
  orgDomain?: string | null;
}

export interface SearchCompanyRequest {
  token: string;
  org_id: string;
}

export interface SearchCompanyResponse {
  status: "queued" | "started" | "threshold_met" | "already_running" | "cooldown" | "error";
  job_id?: string | null;
  pending: number;
  threshold: number;
  message?: string;
  cooldown_remaining?: number;
  cooldown_seconds?: number;
}

export interface WriteEmailRequest {
  token: string;
  org_id: string;
  target_company_id: string;
  recipient_emails?: string[];
  org_domain?: string | null;
  user_id?: string | null;
  feedback?: string | null;
}

export interface WriteEmailResponse {
  status: "queued" | "success" | "partial" | "error";
  job_id?: string | null;
  email_id?: string | null;
  subject?: string | null;
  body?: string | null;
  review_score?: number | null;
  errors?: string[];
  message?: string;
}

export interface JobWebhookEvent {
  job_id: string;
  task_name: "search_companies_arq_task" | "write_email_arq_task" | string;
  org_id: string;
  company_id?: string | null;
  status: "started" | "done" | "failed" | "not_done";
  message: string;
  error?: string | null;
  timestamp?: number;
}
