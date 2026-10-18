import { getSupabaseClient } from "../config/supabaseClient";
import type { OrganizationMember, tMemberRole } from "../types/orgMembers";
import { memberRoles } from "../types/orgMembers";
import type { UserOnboardingStatus } from "../types/onboarding";

export type { UserOnboardingStatus };

export async function checkUserOnboardingStatus(): Promise<UserOnboardingStatus> {
  try {
    const supabase = getSupabaseClient();
    const { data: sessionData, error: sessionErr } =
      await supabase.auth.getSession();

    if (sessionErr || !sessionData?.session?.user) {
      return {
        isAuthenticated: false,
        hasProfile: false,
        headline: null,
        hasOrganization: false,
        orgId: null,
        orgName: null,
        role: null,
        hasVerifiedDomain: false,
        domain: null,
        targetRoute: "/auth",
      };
    }

    const user = sessionData.session.user;
    const userId = user.id;

    // 1. Check if user has completed profile (headline set in user_metadata or user_profiles table)
    let headline = (user.user_metadata?.headline as string) || null;
    let hasProfile = Boolean(headline || user.user_metadata?.profile_completed);

    if (!hasProfile) {
      const { data: profileRow } = await supabase
        .from("user_profiles")
        .select("headline")
        .eq("user_id", userId)
        .not("headline", "is", null)
        .limit(1)
        .maybeSingle();

      if (profileRow?.headline) {
        hasProfile = true;
        headline = profileRow.headline;
      }
    }

    if (!hasProfile) {
      return {
        isAuthenticated: true,
        hasProfile: false,
        headline: null,
        hasOrganization: false,
        orgId: null,
        orgName: null,
        role: null,
        hasVerifiedDomain: false,
        domain: null,
        targetRoute: "/profile-setup",
      };
    }


    const { data: member } = await supabase
      .from("organization_members")
      .select("org_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle<Pick<OrganizationMember, "org_id" | "role">>();


    if (member?.role === memberRoles[1]) {
      let orgName: string | null = null;
      if (member.org_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", member.org_id)
          .limit(1)
          .maybeSingle();
        if (org?.name) {
          orgName = org.name;
        }
      }

      return {
        isAuthenticated: true,
        hasProfile: true,
        headline,
        hasOrganization: true,
        orgId: member.org_id,
        orgName,
        role: member.role,
        hasVerifiedDomain: true,
        domain: null,
        targetRoute: "/home",
      };
    }

    let orgId: string | null = member?.org_id ?? null;
    let memberRole: tMemberRole | null = (member?.role as tMemberRole) ?? null;
    let orgName: string | null = null;

    if (!orgId) {
      // Check if user is owner of an organization
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("owner_id", userId)
        .limit(1)
        .maybeSingle();

      if (org?.id) {
        orgId = org.id;
        orgName = org.name;
        memberRole = "founder";
      }
    }

    if (!orgId) {
      return {
        isAuthenticated: true,
        hasProfile: true,
        headline,
        hasOrganization: false,
        orgId: null,
        orgName: null,
        role: null,
        hasVerifiedDomain: false,
        domain: null,
        targetRoute: "/organization-registration",
      };
    }

    // If orgName not fetched yet, fetch it
    if (!orgName) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .limit(1)
        .maybeSingle();
      if (org?.name) {
        orgName = org.name;
      }
    }

    // 3. Check domain verification status (for founder/owner)
    const { data: domainRec } = await supabase
      .from("domain_verifications")
      .select("domain, verification_status")
      .eq("org_id", orgId)
      .limit(1)
      .maybeSingle();

    const isVerified = domainRec?.verification_status === "verified";

    if (!isVerified) {
      return {
        isAuthenticated: true,
        hasProfile: true,
        headline,
        hasOrganization: true,
        orgId,
        orgName,
        role: memberRole,
        hasVerifiedDomain: false,
        domain: domainRec?.domain ?? null,
        targetRoute: "/domain-verification",
      };
    }

    return {
      isAuthenticated: true,
      hasProfile: true,
      headline,
      hasOrganization: true,
      orgId,
      orgName,
      role: memberRole,
      hasVerifiedDomain: true,
      domain: domainRec?.domain ?? null,
      targetRoute: "/home",
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return {
      isAuthenticated: false,
      hasProfile: false,
      headline: null,
      hasOrganization: false,
      orgId: null,
      orgName: null,
      role: null,
      hasVerifiedDomain: false,
      domain: null,
      targetRoute: "/auth",
    };
  }
}
