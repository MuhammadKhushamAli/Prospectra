import { getSupabaseClient } from "../config/supabaseClient";
import { TABLES } from "../constants/tables";
import type { OrganizationMember, tMemberRole } from "../types/orgMembers";
import { memberRoles } from "../types/orgMembers";
import type { UserOnboardingStatus } from "../types/onboarding";

export type { UserOnboardingStatus };

export async function checkUserOnboardingStatus(): Promise<UserOnboardingStatus> {
  try {
    const supabase = getSupabaseClient();
    // Validate user against server to prevent stale/orphaned sessions from bypassing auth
    const { data: userData, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userData?.user) {
      await supabase.auth.signOut().catch(() => {});
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

    const user = userData.user;
    const userId = user.id;

    // 1. Evaluate Profile Completion status directly from user_profiles table (No auth metadata)
    const { data: profileRow } = await supabase
      .from(TABLES.USER_PROFILES)
      .select("headline")
      .eq("user_id", userId)
      .not("headline", "is", null)
      .limit(1)
      .maybeSingle();

    const headline = profileRow?.headline?.trim() || null;
    const hasProfile = Boolean(headline);

    // 2. Organization Check (initial post-signup step)
    const { data: member } = await supabase
      .from(TABLES.ORGANIZATION_MEMBERS)
      .select("org_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle<Pick<OrganizationMember, "org_id" | "role">>();

    if (member?.role === memberRoles[1]) {
      let orgName: string | null = null;
      if (member.org_id) {
        const { data: org } = await supabase
          .from(TABLES.ORGANIZATIONS)
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
        hasProfile,
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
        .from(TABLES.ORGANIZATIONS)
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

    // If user has not yet registered an organization, route to organization registration
    if (!orgId) {
      return {
        isAuthenticated: true,
        hasProfile,
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
        .from(TABLES.ORGANIZATIONS)
        .select("name")
        .eq("id", orgId)
        .limit(1)
        .maybeSingle();
      if (org?.name) {
        orgName = org.name;
      }
    }

    // 3. Domain verification status check (next step before reaching home)
    const { data: domainRec } = await supabase
      .from(TABLES.DOMAIN_VERIFICATIONS)
      .select("domain, verification_status")
      .eq("org_id", orgId)
      .limit(1)
      .maybeSingle();

    const isVerified = domainRec?.verification_status === "verified";

    if (!isVerified) {
      return {
        isAuthenticated: true,
        hasProfile,
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

    // 4. Organization and Domain verification complete -> Target route is /home
    // Home screen will display the "Complete Profile" button and enforce lock if !hasProfile
    return {
      isAuthenticated: true,
      hasProfile,
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
