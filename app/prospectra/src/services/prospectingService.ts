import axios from "axios";

import { getSupabaseClient } from "../config/supabaseClient";
import { TABLES } from "../constants/tables";
import { DB_KEYS } from "../constants/dbKeys";
import { resolveUserOrgMembership } from "./onboarding/resolveUserOrgMembership";
import { resolveAuthToken, resolveOrganizationId } from "./emailGenerationService";
import type {
  CompanyProspect,
  EmailProspect,
  ProspectingData,
  ProspectingRole,
} from "../types/prospecting";

export {
  initiateCompanyFinder,
} from "./companyFinderService";
export {
  requestEmailGeneration,
} from "./emailGenerationService";
export {
  ensureMobileNotificationPermissions,
  sendMobileJobNotification,
  subscribeToJobWebhooks,
} from "./jobWebhookService";


export function mapCompanyRow(r: any, contactsMap?: Map<string, any[]>): CompanyProspect {
  const authScore = r.auth_score ?? r.raw_signals?.auth_score;
  const authFeedback = r.auth_feedback || r.raw_signals?.auth_feedback;
  const neededSkills =
    r.needed_skills && r.needed_skills.length > 0
      ? r.needed_skills
      : r.raw_signals?.needed_skills || r.raw_signals?.user_skills || [];
  const neededServices =
    r.needed_services && r.needed_services.length > 0
      ? r.needed_services
      : r.raw_signals?.needed_services || [];
  const needSignals =
    r.need_signals && r.need_signals.length > 0
      ? r.need_signals
      : r.raw_signals?.need_signals || [];
  const needHypothesis = r.need_hypothesis || r.raw_signals?.need_hypothesis || null;
  const proposedSolution = r.proposed_solution || r.raw_signals?.proposed_solution || null;
  const servicesOffered =
    r.services_offered && r.services_offered.length > 0
      ? r.services_offered
      : r.raw_signals?.services_offered || [];
  const digitalFeatures =
    r.digital_features && r.digital_features.length > 0
      ? r.digital_features
      : r.raw_signals?.digital_features || [];
  const aboutText = r.about_text || r.raw_signals?.about_text || null;

  const contacts = contactsMap?.get(r.id) || (Array.isArray(r.emails) ? r.emails : undefined);

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
    source: Array.isArray(r.source) ? r.source.join(", ") : r.source || "searxng",
    about_text: aboutText,
    need_hypothesis: needHypothesis,
    needed_skills: neededSkills,
    needed_services: neededServices,
    need_signals: needSignals,
    proposed_solution: proposedSolution,
    services_offered: servicesOffered,
    digital_features: digitalFeatures,
    auth_score: authScore,
    auth_feedback: authFeedback,
    raw_signals: r.raw_signals,
    status: r.status,
    company_auth:
      authScore !== undefined && authScore !== null
        ? {
            score: authScore,
            feedback: authFeedback || null,
            user_skills: neededSkills,
            target_industries: r.raw_signals?.target_industries || (r.industry ? [r.industry] : []),
          }
        : null,
    emails: contacts,
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

  const rawReplies = Array.isArray(r.replies) ? r.replies : [];
  const hasSingleReplyFallback =
    rawReplies.length === 0 &&
    (r.status === "replied" || Boolean(r.reply_snippet) || Boolean(r.reply_from));

  const replies = hasSingleReplyFallback
    ? [
        {
          id: `reply-${r.id}-0`,
          sender: r.reply_from || r.recipient_email || "Prospect",
          subject: r.reply_subject || `Re: ${subject}`,
          snippet: r.reply_snippet || "Reply received.",
          date: r.replied_at || r.sent_at || r.created_at,
        },
      ]
    : rawReplies;

  const replyCount =
    typeof r.reply_count === "number" && r.reply_count > 0
      ? r.reply_count
      : replies.length;

  return {
    id: r.id,
    company_id: r.company_id,
    org_id: r.sent_by_org_id || r.org_id,
    sent_by_org_id: r.sent_by_org_id || r.org_id,
    sent_by_user_id: r.sent_by_user_id || r.user_id,
    user_id: r.sent_by_user_id || r.user_id,
    from_email: r.from_email || "outreach@prospectra.com",
    to_email: r.recipient_email || r.to_email || "prospect@target.com",
    recipient_email: r.recipient_email || r.to_email,
    recipient_emails: Array.isArray(r.recipient_emails) ? r.recipient_emails : undefined,
    message_id: r.message_id,
    reply_snippet: r.reply_snippet,
    reply_from: r.reply_from,
    reply_subject: r.reply_subject,
    replied_at: r.replied_at,
    reply_count: replyCount,
    replies,
    sent_at: r.sent_at,
    email_body: {
      subject,
      body,
    },
    subject,
    body,
    company_name: r.companies?.name || company?.name || "Target Outreach",
    company_domain: r.companies?.domain || company?.domain || "",
    status: r.status,
    verification:
      r.review_score !== null && r.review_score !== undefined
        ? {
            score: Math.round(r.review_score),
            feedback: r.review_feedback || "Agent verified outreach relevance",
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

async function fetchContactsMap(
  supabase: any,
  companyIds: string[],
): Promise<Map<string, any[]>> {
  const map = new Map<string, any[]>();
  if (!companyIds || companyIds.length === 0) return map;

  try {
    const { data } = await supabase
      .from(TABLES.CONTACTS)
      .select("*")
      .in("company_id", companyIds);

    if (data) {
      for (const row of data) {
        const cId = row.company_id;
        if (!map.has(cId)) {
          map.set(cId, []);
        }
        map.get(cId)!.push({
          email: row.email,
          email_of: row.role || "Contact",
          is_verified: row.is_reachable === "safe" || row.is_reachable === "valid",
          first_name: row.name ? row.name.split(" ")[0] : null,
          last_name: row.name ? row.name.split(" ").slice(1).join(" ") : null,
          is_reachable: row.is_reachable,
        });
      }
    }
  } catch {
    // Non-fatal if contacts table query is restricted
  }

  return map;
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
      orgDomain: null,
    };
  }

  const currentUserId = user.id;

  // 1. Resolve organization membership, company name, and role using shared helper
  const membership = await resolveUserOrgMembership(supabase, currentUserId);
  const orgId = membership.orgId;
  const orgName = membership.orgName;
  const role: ProspectingRole = membership.isMember ? "member" : "founder";

  if (!orgId) {
    return {
      companies: [],
      emails: [],
      role,
      currentUserId,
      orgId: null,
      orgName: orgName || "Primary Workspace",
      orgDomain: null,
    };
  }

  // 2. Fetch primary verified domain for this organization
  let orgDomain: string | null = null;
  try {
    const { data: domainRec } = await supabase
      .from(TABLES.DOMAIN_VERIFICATIONS)
      .select(DB_KEYS.DOMAIN)
      .eq(DB_KEYS.ORG_ID, orgId)
      .limit(1)
      .maybeSingle();
    orgDomain = domainRec?.domain ?? null;
  } catch {
    // Non-fatal if domain verification query fails
  }

  // 3. Query Supabase depending on role:
  if (role === "founder") {
    const { data: compRows } = await supabase
      .from(TABLES.COMPANIES)
      .select("*")
      .eq(DB_KEYS.ORG_ID, orgId)
      .order(DB_KEYS.CREATED_AT, { ascending: false });

    const { data: emailRows } = await supabase
      .from(TABLES.EMAILS)
      .select("*, companies(name, domain)")
      .eq(DB_KEYS.SENT_BY_ORG_ID, orgId)
      .order(DB_KEYS.CREATED_AT, { ascending: false });

    const compIds = (compRows || []).map((c: any) => c.id).filter(Boolean);
    const contactsMap = await fetchContactsMap(supabase, compIds);

    const companies: CompanyProspect[] = (compRows || []).map((r: any) =>
      mapCompanyRow(r, contactsMap),
    );
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
      orgDomain,
    };
  }

  // MEMBER: Only view emails and companies by comparing their user id and org id
  const { data: memberEmailRows } = await supabase
    .from(TABLES.EMAILS)
    .select("*, companies(name, domain)")
    .eq(DB_KEYS.SENT_BY_ORG_ID, orgId)
    .eq(DB_KEYS.SENT_BY_USER_ID, currentUserId)
    .order(DB_KEYS.CREATED_AT, { ascending: false });

  let memberCompRows: any[] | null = null;

  try {
    const directQuery = await supabase
      .from(TABLES.COMPANIES)
      .select("*")
      .eq(DB_KEYS.ORG_ID, orgId)
      .eq(DB_KEYS.USER_ID, currentUserId)
      .order(DB_KEYS.CREATED_AT, { ascending: false });

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
        .eq(DB_KEYS.ORG_ID, orgId)
        .in(DB_KEYS.ID, emailCompanyIds)
        .order(DB_KEYS.CREATED_AT, { ascending: false });

      if (linkedComps) {
        memberCompRows = linkedComps;
      }
    }
  }

  const memberCompIds = (memberCompRows || []).map((c: any) => c.id).filter(Boolean);
  const memberContactsMap = await fetchContactsMap(supabase, memberCompIds);

  const companies: CompanyProspect[] = (memberCompRows || []).map((r: any) =>
    mapCompanyRow(r, memberContactsMap),
  );
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
    orgDomain,
  };
}

export interface CompanyStatusChangeOptions {
  orgId?: string;
  recipientEmails?: string[];
  orgDomain?: string;
  feedback?: string;
}

/**
 * Updates a company's review status via the single backend endpoint:
 * Every DB change occurs strictly in the backend, not in the app.
 */
export async function updateCompanyStatusInDb(
  companyId: string,
  status: "approved" | "rejected",
  options?: CompanyStatusChangeOptions,
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = getSupabaseClient();
    let orgId = options?.orgId;
    if (!orgId) {
      const { data: currentComp } = await supabase
        .from(TABLES.COMPANIES)
        .select(DB_KEYS.ORG_ID)
        .eq(DB_KEYS.ID, companyId)
        .maybeSingle();
      orgId = currentComp?.org_id;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL;

    if (!baseURL) {
      throw new Error("Backend URL (EXPO_PUBLIC_BACKEND_URL) is not configured.");
    }
    if (!token) {
      throw new Error("User session token is missing.");
    }
    if (!orgId) {
      throw new Error("Organization ID could not be resolved.");
    }

    const response = await axios.post(
      `${baseURL}/api/v1/company-status`,
      {
        token,
        org_id: orgId,
        company_id: companyId,
        status,
        recipient_emails: options?.recipientEmails,
        org_domain: options?.orgDomain,
        feedback: options?.feedback,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      },
    );

    return {
      success: true,
      message: response.data?.message,
    };
  } catch (err: any) {
    const detail =
      err?.response?.data?.detail ||
      err?.message ||
      "Failed to update company review status.";
    console.warn("Backend rejected company status change:", detail);
    throw new Error(detail);
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
      .update({ [DB_KEYS.STATUS]: status })
      .eq(DB_KEYS.ID, emailId);

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

function isMissingReviewColumnError(error: any): boolean {
  const code = String(error?.code || "");
  const msg = String(error?.message || "").toLowerCase();
  return (
    (code === "PGRST204" || msg.includes("schema cache")) &&
    (msg.includes("review_score") || msg.includes("review_feedback"))
  );
}

/**
 * Updates an email's subject, body, and review metadata in the database.
 */
export async function updateEmailContentInDb(
  emailId: string,
  subject: string,
  body: string,
  reviewScore?: number,
  reviewFeedback?: string,
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const basePayload: Record<string, any> = {
      [DB_KEYS.SUBJECT]: subject,
      [DB_KEYS.BODY]: body,
    };
    const payload: Record<string, any> = { ...basePayload };
    if (reviewScore !== undefined) {
      payload[DB_KEYS.REVIEW_SCORE] = reviewScore;
    }
    if (reviewFeedback !== undefined) {
      payload[DB_KEYS.REVIEW_FEEDBACK] = reviewFeedback;
    }

    let { error } = await supabase
      .from(TABLES.EMAILS)
      .update(payload)
      .eq(DB_KEYS.ID, emailId);

    // Retry without review_* columns if DB reset hasn't added them to the live schema cache yet
    if (
      error &&
      isMissingReviewColumnError(error) &&
      (DB_KEYS.REVIEW_SCORE in payload || DB_KEYS.REVIEW_FEEDBACK in payload)
    ) {
      const retryRes = await supabase
        .from(TABLES.EMAILS)
        .update(basePayload)
        .eq(DB_KEYS.ID, emailId);
      error = retryRes.error;
    }

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

/**
 * Dispatches an outreach email to the selected contact(s) via the backend SMTP service (aiosmtplib).
 */
export async function sendOutreachEmailViaBackend(
  emailId: string,
  targetOrgId?: string,
  recipientEmails?: string[],
  companyId?: string,
  customSubject?: string,
  customBody?: string,
): Promise<{ status: string; message: string; recipients_sent: string[] }> {
  const token = await resolveAuthToken();
  const orgId = await resolveOrganizationId(targetOrgId);
  const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL;

  if (!baseURL) {
    throw new Error("Backend URL (EXPO_PUBLIC_BACKEND_URL) is not configured.");
  }

  const response = await axios.post(
    `${baseURL}/api/v1/send-email`,
    {
      token,
      org_id: orgId,
      email_id: emailId,
      company_id: companyId,
      recipient_emails:
        recipientEmails && recipientEmails.length > 0 ? recipientEmails : undefined,
      custom_subject: customSubject,
      custom_body: customBody,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 25000,
    },
  );

  return response.data;
}
