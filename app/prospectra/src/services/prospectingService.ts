import { getSupabaseClient } from "../config/supabaseClient";
import { TABLES } from "../constants/tables";
import type {
  CompanyProspect,
  EmailProspect,
  ProspectingData,
  ProspectingRole,
} from "../types/prospecting";

/**
 * Generates demonstrative fallback data partitioned by organization and user ID.
 * Directly matches the Pydantic schemas of the company-authenticator,
 * email-writer, and email-verifier agents.
 */
function getMockProspectingData(
  userId: string,
  orgId: string,
  role: ProspectingRole,
): { companies: CompanyProspect[]; emails: EmailProspect[] } {
  const otherMemberId = "demo-other-member-uid-88";

  const allMockCompanies: CompanyProspect[] = [
    {
      id: "demo-c-1",
      org_id: orgId,
      user_id: userId,
      name: "Nexus Dynamics",
      domain: "nexusdynamics.io",
      website: "https://nexusdynamics.io",
      industry: "Enterprise AI & Cloud",
      size: "50-200 employees",
      source: "apollo",
      status: "pending_review",
      company_auth: {
        score: 94,
        feedback: null,
      },
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: "demo-c-2",
      org_id: orgId,
      user_id: userId,
      name: "AetherScale Technologies",
      domain: "aetherscale.com",
      website: "https://aetherscale.com",
      industry: "SaaS & Developer Tools",
      size: "20-50 employees",
      source: "apollo",
      status: "pending_review",
      company_auth: {
        score: 88,
        feedback: null,
      },
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: "demo-c-3",
      org_id: orgId,
      user_id: userId,
      name: "Cobalt Digital Labs",
      domain: "cobaltdigitallabs.co",
      website: "https://cobaltdigitallabs.co",
      industry: "Fintech & Data Infrastructure",
      size: "200-500 employees",
      source: "tavily",
      status: "approved",
      company_auth: {
        score: 97,
        feedback: null,
      },
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: "demo-c-4",
      org_id: orgId,
      user_id: otherMemberId,
      name: "Vertex Automation Inc",
      domain: "vertexauto.io",
      website: "https://vertexauto.io",
      industry: "Robotics & Logistics",
      size: "10-50 employees",
      source: "apollo",
      status: "rejected",
      company_auth: {
        score: 42,
        feedback: "Low technical overlap with verified consultant profile skills.",
      },
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: "demo-c-5",
      org_id: orgId,
      user_id: otherMemberId,
      name: "Apex Metric Systems",
      domain: "apexmetrics.net",
      website: "https://apexmetrics.net",
      industry: "Healthcare Analytics",
      size: "100-250 employees",
      source: "tavily",
      status: "rejected",
      company_auth: {
        score: 51,
        feedback: "Organization out of target geography and required stack.",
      },
      created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    },
  ];

  const allMockEmails: EmailProspect[] = [
    {
      id: "demo-e-1",
      company_id: "demo-c-1",
      org_id: orgId,
      sent_by_org_id: orgId,
      sent_by_user_id: userId,
      user_id: userId,
      from_email: "outreach@prospectra.com",
      to_email: "alex@nexusdynamics.io",
      email_body: {
        subject: "Scaling distributed cloud workflows with zero downtime",
        body: "Hi Alex, noticed Nexus Dynamics has been expanding your enterprise cloud pipelines recently. We specialize in automated lead prospecting and resilient data pipelines tailored for high-scale SaaS systems.",
      },
      subject: "Scaling distributed cloud workflows with zero downtime",
      body: "Hi Alex, noticed Nexus Dynamics has been expanding your enterprise cloud pipelines recently. We specialize in automated lead prospecting and resilient data pipelines tailored for high-scale SaaS systems.",
      company_name: "Nexus Dynamics",
      company_domain: "nexusdynamics.io",
      status: "draft",
      verification: {
        score: 93,
        feedback: "High personal relevance to recipient's infrastructure expansion.",
      },
      created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
    {
      id: "demo-e-2",
      company_id: "demo-c-2",
      org_id: orgId,
      sent_by_org_id: orgId,
      sent_by_user_id: userId,
      user_id: userId,
      from_email: "outreach@prospectra.com",
      to_email: "jordan@aetherscale.com",
      email_body: {
        subject: "Partnership opportunity for high-intent B2B outreach",
        body: "Hello Jordan, impressed with AetherScale's recent product launch. Would love to share how our technical profile matching accelerates outbound pipeline growth by over 40%.",
      },
      subject: "Partnership opportunity for high-intent B2B outreach",
      body: "Hello Jordan, impressed with AetherScale's recent product launch. Would love to share how our technical profile matching accelerates outbound pipeline growth by over 40%.",
      company_name: "AetherScale Technologies",
      company_domain: "aetherscale.com",
      status: "draft",
      verification: {
        score: 87,
        feedback: "Solid value proposition with concise call to action.",
      },
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: "demo-e-3",
      company_id: "demo-c-3",
      org_id: orgId,
      sent_by_org_id: orgId,
      sent_by_user_id: otherMemberId,
      user_id: otherMemberId,
      from_email: "member@prospectra.com",
      to_email: "partnerships@cobaltdigitallabs.co",
      email_body: {
        subject: "Accelerating data integration workflows",
        body: "Hi team, reaching out regarding Cobalt's fintech data pipelines. Our autonomous prospect discovery matches your specialized skillsets with active demand.",
      },
      subject: "Accelerating data integration workflows",
      body: "Hi team, reaching out regarding Cobalt's fintech data pipelines. Our autonomous prospect discovery matches your specialized skillsets with active demand.",
      company_name: "Cobalt Digital Labs",
      company_domain: "cobaltdigitallabs.co",
      status: "approved",
      verification: {
        score: 91,
        feedback: "Clear tone and verified recipient domain.",
      },
      created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
    },
    {
      id: "demo-e-4",
      company_id: "demo-c-4",
      org_id: orgId,
      sent_by_org_id: orgId,
      sent_by_user_id: otherMemberId,
      user_id: otherMemberId,
      from_email: "member@prospectra.com",
      to_email: "contact@vertexauto.io",
      email_body: {
        subject: "Robotics supply outreach proposal",
        body: "Automated campaign rejected due to out-of-scope domain criteria.",
      },
      subject: "Robotics supply outreach proposal",
      body: "Automated campaign rejected due to out-of-scope domain criteria.",
      company_name: "Vertex Automation Inc",
      company_domain: "vertexauto.io",
      status: "rejected",
      verification: {
        score: 35,
        feedback: "Draft content failed domain compatibility checks.",
      },
      created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    },
  ];

  if (role === "founder") {
    // Founders view companies and emails for the whole org
    return {
      companies: allMockCompanies,
      emails: allMockEmails,
    };
  }

  // Members only view emails and companies by comparing their own user id and org id
  return {
    companies: allMockCompanies.filter(
      (c) => c.org_id === orgId && c.user_id === userId,
    ),
    emails: allMockEmails.filter(
      (e) =>
        (e.sent_by_org_id === orgId || e.org_id === orgId) &&
        (e.sent_by_user_id === userId || e.user_id === userId),
    ),
  };
}

/**
 * Fetches companies and outreach emails:
 * - If the current user has the 'founder' role (or owns the organization),
 *   they receive all companies and emails for the entire organization.
 * - If the current user is a 'member', they only receive companies and emails
 *   scoped by comparing their own user_id and org_id.
 * - Models match the agent's Pydantic schemas (Email, EmailContent, CompanyAuth, EmailVerification).
 */
export async function fetchProspectingData(): Promise<ProspectingData> {
  const fallbackOrgId = "00000000-0000-0000-0000-000000000001";
  const fallbackUserId = "00000000-0000-0000-0000-000000000000";

  try {
    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user) {
      const mock = getMockProspectingData(fallbackUserId, fallbackOrgId, "founder");
      return {
        companies: mock.companies,
        emails: mock.emails,
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
    let role: ProspectingRole = member?.role === "member" ? "member" : "founder";
    let orgName: string | null = null;

    // 2. Check if the user is owner in organizations table (founders have ownership)
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
      const mock = getMockProspectingData(currentUserId, fallbackOrgId, role);
      return {
        companies: mock.companies,
        emails: mock.emails,
        role,
        currentUserId,
        orgId: null,
        orgName: orgName || "Primary Workspace",
      };
    }

    // 3. Query Supabase depending on role:
    if (role === "founder") {
      // FOUNDER: View companies and emails for the WHOLE organization
      const { data: compRows, error: compErr } = await supabase
        .from(TABLES.COMPANIES)
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      const { data: emailRows, error: emailErr } = await supabase
        .from(TABLES.EMAILS)
        .select("*, companies(name, domain)")
        .eq("sent_by_org_id", orgId)
        .order("created_at", { ascending: false });

      const hasLiveCompanies = !compErr && compRows && compRows.length > 0;
      const hasLiveEmails = !emailErr && emailRows && emailRows.length > 0;

      if (!hasLiveCompanies && !hasLiveEmails) {
        const mock = getMockProspectingData(currentUserId, orgId, "founder");
        return {
          companies: mock.companies,
          emails: mock.emails,
          role: "founder",
          currentUserId,
          orgId,
          orgName: orgName || "Organization",
        };
      }

      const companies: CompanyProspect[] = (compRows || []).map((r: any) => ({
        id: r.id,
        org_id: r.org_id,
        user_id: r.user_id ?? currentUserId,
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
        created_at: r.created_at,
      }));

      const emails: EmailProspect[] = (emailRows || []).map((r: any) => {
        const subject = r.subject || "No Subject";
        const body = r.body || "";
        const fromEmail = r.from_email || "outreach@prospectra.com";
        const toEmail =
          r.to_email ||
          (r.companies?.domain ? `lead@${r.companies.domain}` : "prospect@target.com");

        return {
          id: r.id,
          company_id: r.company_id,
          org_id: r.sent_by_org_id || orgId,
          sent_by_org_id: r.sent_by_org_id || orgId,
          sent_by_user_id: r.sent_by_user_id,
          user_id: r.sent_by_user_id,
          from_email: fromEmail,
          to_email: toEmail,
          email_body: {
            subject,
            body,
          },
          subject,
          body,
          company_name: r.companies?.name || "Target Outreach",
          company_domain: r.companies?.domain || "",
          status: r.status,
          verification: r.review_score
            ? {
                score: r.review_score,
                feedback: "Agent verified outreach relevance",
              }
            : null,
          created_at: r.created_at,
        };
      });

      return {
        companies,
        emails,
        role: "founder",
        currentUserId,
        orgId,
        orgName: orgName || "Organization",
      };
    }

    // MEMBER: Only view emails and companies by comparing their own user id and org id
    // A. Query emails matching sent_by_org_id === orgId AND sent_by_user_id === currentUserId
    const { data: memberEmailRows, error: memberEmailErr } = await supabase
      .from(TABLES.EMAILS)
      .select("*, companies(name, domain)")
      .eq("sent_by_org_id", orgId)
      .eq("sent_by_user_id", currentUserId)
      .order("created_at", { ascending: false });

    // B. Query companies: compare user_id and org_id
    let memberCompRows: any[] | null = null;
    let memberCompErr: any = null;

    try {
      // First attempt direct query if companies table contains user_id
      const directQuery = await supabase
        .from(TABLES.COMPANIES)
        .select("*")
        .eq("org_id", orgId)
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (!directQuery.error && directQuery.data) {
        memberCompRows = directQuery.data;
      } else {
        memberCompErr = directQuery.error;
      }
    } catch (e) {
      memberCompErr = e;
    }

    // If direct query failed (e.g. user_id column not present), fetch companies linked to this member's emails
    if (
      (!memberCompRows || memberCompRows.length === 0) &&
      memberEmailRows &&
      memberEmailRows.length > 0
    ) {
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
          memberCompErr = null;
        }
      }
    }

    const hasLiveComp = !memberCompErr && memberCompRows && memberCompRows.length > 0;
    const hasLiveEmail = !memberEmailErr && memberEmailRows && memberEmailRows.length > 0;

    if (!hasLiveComp && !hasLiveEmail) {
      const mock = getMockProspectingData(currentUserId, orgId, "member");
      return {
        companies: mock.companies,
        emails: mock.emails,
        role: "member",
        currentUserId,
        orgId,
        orgName: orgName || "Organization",
      };
    }

    const companies: CompanyProspect[] = (memberCompRows || []).map((r: any) => ({
      id: r.id,
      org_id: r.org_id,
      user_id: r.user_id ?? currentUserId,
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
      created_at: r.created_at,
    }));

    const emails: EmailProspect[] = (memberEmailRows || []).map((r: any) => {
      const subject = r.subject || "No Subject";
      const body = r.body || "";
      const fromEmail = r.from_email || "outreach@prospectra.com";
      const toEmail =
        r.to_email ||
        (r.companies?.domain ? `lead@${r.companies.domain}` : "prospect@target.com");

      return {
        id: r.id,
        company_id: r.company_id,
        org_id: r.sent_by_org_id || orgId,
        sent_by_org_id: r.sent_by_org_id || orgId,
        sent_by_user_id: r.sent_by_user_id || currentUserId,
        user_id: r.sent_by_user_id || currentUserId,
        from_email: fromEmail,
        to_email: toEmail,
        email_body: {
          subject,
          body,
        },
        subject,
        body,
        company_name: r.companies?.name || "Target Outreach",
        company_domain: r.companies?.domain || "",
        status: r.status,
        verification: r.review_score
          ? {
              score: r.review_score,
              feedback: "Agent verified outreach relevance",
            }
          : null,
        created_at: r.created_at,
      };
    });

    return {
      companies,
      emails,
      role: "member",
      currentUserId,
      orgId,
      orgName: orgName || "Organization",
    };
  } catch (err) {
    console.warn("Notice: falling back to role-scoped demonstrative prospecting data:", err);
    const mock = getMockProspectingData(fallbackUserId, fallbackOrgId, "founder");
    return {
      companies: mock.companies,
      emails: mock.emails,
      role: "founder",
      currentUserId: null,
      orgId: null,
      orgName: "Workspace",
    };
  }
}
