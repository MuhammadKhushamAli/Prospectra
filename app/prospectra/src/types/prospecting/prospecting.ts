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
}

export interface SearchCompanyRequest {
  token: string;
  org_id: string;
}

export interface SearchCompanyResponse {
  status: "started" | "threshold_met" | "error";
  pending: number;
  threshold: number;
  message?: string;
}

