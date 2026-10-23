import { getSupabaseClient } from "../config/supabaseClient";
import { TABLES } from "../constants/tables";
import type {
  CompanyProspect,
  EmailProspect,
  ProspectingData,
  ProspectingRole,
} from "../types/prospecting";

export {
  initiateCompanyFinder,
} from "./companyFinderService";


export function mapCompanyRow(r: any): CompanyProspect {
  return {
    id: r.id,
    org_id: r.org_id,
    user_id: r.user_id,
    name: r.name,
    domain: r.domain || "",
    website: r.website,
    linkedin_url: r.linkedin_url,
    industry: r.industry || "General Industry",
    size: r.size || "10-50 employees",
    source: Array.isArray(r.source) ? r.source.join(", ") : r.source || "apollo",
    raw_signals: r.raw_signals,
    status: r.status,
    company_auth: r.raw_signals?.auth_score
      ? {
          score: r.raw_signals.auth_score,
          feedback: r.raw_signals.auth_feedback || null,
        }
      : null,
    emails: Array.isArray(r.emails) ? r.emails : undefined,
    created_at: r.created_at,
  };
}

export function mapEmailRow(
  r: any,
  companyMap?: Map<string, CompanyProspect>,
): EmailProspect {
  const subject = r.subject || "No Subject";
  const body = r.body || "";
  const company = companyMap?.get(r.company_id);

  return {
    id: r.id,
    company_id: r.company_id,
    org_id: r.sent_by_org_id || r.org_id,
    sent_by_org_id: r.sent_by_org_id || r.org_id,
    sent_by_user_id: r.sent_by_user_id || r.user_id,
    user_id: r.sent_by_user_id || r.user_id,
    from_email: r.from_email || "outreach@prospectra.com",
    to_email: r.to_email || "prospect@target.com",
    email_body: {
      subject,
      body,
    },
    subject,
    body,
    company_name: r.companies?.name || company?.name || "Target Outreach",
    company_domain: r.companies?.domain || company?.domain || "",
    status: r.status,
    verification: r.review_score
      ? {
          score: r.review_score,
          feedback: "Agent verified outreach relevance",
        }
      : null,
    created_at: r.created_at,
  };
}

export function subscribeToProspectingRealtime(
  orgIdOrGetter: string | null | (() => string | null),
  callbacks: {
    onCompanyChange: (
      company: CompanyProspect,
      eventType: "INSERT" | "UPDATE" | "DELETE",
    ) => void;
    onEmailChange: (
      email: EmailProspect,
      eventType: "INSERT" | "UPDATE" | "DELETE",
    ) => void;
  },
): () => void {
  const supabase = getSupabaseClient();
  const channelName = `prospecting-live-feed-${Date.now()}`;

  const getTargetOrgId = () => {
    return typeof orgIdOrGetter === "function" ? orgIdOrGetter() : orgIdOrGetter;
  };

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLES.COMPANIES,
      },
      (payload) => {
        const eventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
        const row: any = eventType === "DELETE" ? payload.old : payload.new;
        if (row && row.id) {
          const currentOrgId = getTargetOrgId();
          if (currentOrgId && row.org_id && row.org_id !== currentOrgId) {
            return;
          }
          callbacks.onCompanyChange(mapCompanyRow(row), eventType);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLES.EMAILS,
      },
      (payload) => {
        const eventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
        const row: any = eventType === "DELETE" ? payload.old : payload.new;
        if (row && row.id) {
          const currentOrgId = getTargetOrgId();
          if (currentOrgId && row.sent_by_org_id && row.sent_by_org_id !== currentOrgId) {
            return;
          }
          callbacks.onEmailChange(mapEmailRow(row), eventType);
        }
      },
    )
    .subscribe((status, err) => {
      if (status === "CHANNEL_ERROR") {
        console.warn("Realtime subscription channel error:", err?.message || err);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function fetchProspectingData(): Promise<ProspectingData> {
  const supabase = getSupabaseClient();

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (!user) {
    return {
      companies: [],
      emails: [],
      role: "founder",
      currentUserId: null,
      orgId: null,
      orgName: "Workspace",
    };
  }

  const currentUserId = user.id;

  // 1. Determine user membership and role from organization_members
  const { data: member } = await supabase
    .from(TABLES.ORGANIZATION_MEMBERS)
    .select("org_id, role")
    .eq("user_id", currentUserId)
    .limit(1)
    .maybeSingle();

  let orgId = member?.org_id ?? null;
  let role: ProspectingRole = member?.role;
  let orgName: string | null = null;

  // 2. Check if the user is owner in organizations table
  if (!orgId || role !== "founder") {
    const { data: ownerOrg } = await supabase
      .from(TABLES.ORGANIZATIONS)
      .select("id, name, owner_id")
      .eq("owner_id", currentUserId)
      .limit(1)
      .maybeSingle();

    if (ownerOrg?.id) {
      orgId = orgId || ownerOrg.id;
      orgName = ownerOrg.name;
      role = "founder";
    }
  }

  // Resolve organization name if not yet loaded
  if (orgId && !orgName) {
    const { data: orgRow } = await supabase
      .from(TABLES.ORGANIZATIONS)
      .select("name")
      .eq("id", orgId)
      .limit(1)
      .maybeSingle();
    if (orgRow?.name) {
      orgName = orgRow.name;
    }
  }

  if (!orgId) {
    return {
      companies: [],
      emails: [],
      role,
      currentUserId,
      orgId: null,
      orgName: orgName || "Primary Workspace",
    };
  }

  // 3. Query Supabase depending on role:
  if (role === "founder") {
    const { data: compRows } = await supabase
      .from(TABLES.COMPANIES)
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    const { data: emailRows } = await supabase
      .from(TABLES.EMAILS)
      .select("*, companies(name, domain)")
      .eq("sent_by_org_id", orgId)
      .order("created_at", { ascending: false });

    const companies: CompanyProspect[] = (compRows || []).map(mapCompanyRow);
    const companyMap = new Map(companies.map((c) => [c.id, c]));
    const emails: EmailProspect[] = (emailRows || []).map((r: any) =>
      mapEmailRow(r, companyMap),
    );

    return {
      companies,
      emails,
      role: "founder",
      currentUserId,
      orgId,
      orgName: orgName || "Organization",
    };
  }

  // MEMBER: Only view emails and companies by comparing their user id and org id
  const { data: memberEmailRows } = await supabase
    .from(TABLES.EMAILS)
    .select("*, companies(name, domain)")
    .eq("sent_by_org_id", orgId)
    .eq("sent_by_user_id", currentUserId)
    .order("created_at", { ascending: false });

  let memberCompRows: any[] | null = null;

  try {
    const directQuery = await supabase
      .from(TABLES.COMPANIES)
      .select("*")
      .eq("org_id", orgId)
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (!directQuery.error && directQuery.data) {
      memberCompRows = directQuery.data;
    }
  } catch {
    // Fall back to linked companies below
  }

  if ((!memberCompRows || memberCompRows.length === 0) && memberEmailRows && memberEmailRows.length > 0) {
    const emailCompanyIds = Array.from(
      new Set(memberEmailRows.map((e: any) => e.company_id).filter(Boolean)),
    );

    if (emailCompanyIds.length > 0) {
      const { data: linkedComps } = await supabase
        .from(TABLES.COMPANIES)
        .select("*")
        .eq("org_id", orgId)
        .in("id", emailCompanyIds)
        .order("created_at", { ascending: false });

      if (linkedComps) {
        memberCompRows = linkedComps;
      }
    }
  }

  const companies: CompanyProspect[] = (memberCompRows || []).map(mapCompanyRow);
  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const emails: EmailProspect[] = (memberEmailRows || []).map((r: any) =>
    mapEmailRow(r, companyMap),
  );

  return {
    companies,
    emails,
    role: "member",
    currentUserId,
    orgId,
    orgName: orgName || "Organization",
  };
}

/**
 * Updates a company's status directly in the database (e.g. 'approved' or 'rejected').
 */
export async function updateCompanyStatusInDb(
  companyId: string,
  status: CompanyProspect["status"],
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from(TABLES.COMPANIES)
      .update({ status })
      .eq("id", companyId);

    if (error) {
      console.warn("Could not update company status in DB:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Error updating company status in DB:", err);
    return false;
  }
}

/**
 * Updates an email's status in the database (e.g. 'sent' or 'rejected').
 */
export async function updateEmailStatusInDb(
  emailId: string,
  status: EmailProspect["status"],
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from(TABLES.EMAILS)
      .update({ status })
      .eq("id", emailId);

    if (error) {
      console.warn("Could not update email status in DB:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Error updating email status in DB:", err);
    return false;
  }
}

/**
 * Updates an email's subject, body, and review score in the database.
 */
export async function updateEmailContentInDb(
  emailId: string,
  subject: string,
  body: string,
  reviewScore?: number,
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const payload: Record<string, any> = { subject, body };
    if (reviewScore !== undefined) {
      payload.review_score = reviewScore;
    }

    const { error } = await supabase
      .from(TABLES.EMAILS)
      .update(payload)
      .eq("id", emailId);

    if (error) {
      console.warn("Could not update email content in DB:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Error updating email content in DB:", err);
    return false;
  }
}