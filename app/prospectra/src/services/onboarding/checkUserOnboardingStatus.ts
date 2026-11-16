import { getSupabaseClient } from "../../config/supabaseClient";
import { TABLES } from "../../constants/tables";
import { DB_KEYS } from "../../constants/dbKeys";
import type { UserOnboardingStatus } from "../../types/onboarding";
import { createDefaultUnauthenticatedStatus } from "./createDefaultUnauthenticatedStatus";
import { resolveUserOrgMembership } from "./resolveUserOrgMembership";
import { fetchUserHeadline } from "./fetchUserHeadline";
import { getVerificationCompletionStatus } from "./isDomainVerified";
import { adminService } from "../adminService";

/**
 * Evaluates the full onboarding checklist for an authenticated user,
 * maintaining targetRoute, headline, and company name (orgName).
 */
export async function checkUserOnboardingStatus(): Promise<UserOnboardingStatus> {
  try {
    const supabase = getSupabaseClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userData?.user) {
      await supabase.auth.signOut().catch(() => {});
      return createDefaultUnauthenticatedStatus();
    }

    const userId = userData.user.id;

    // 1. Resolve Organization Membership and Company Name
    let { orgId, orgName, isMember } = await resolveUserOrgMembership(
      supabase,
      userId,
    );

    // If no organization registered yet -> check if user has a pending invitation to claim!
    if (!orgId) {
      try {
        const claimResult = await adminService.claimInviteOnSignup();
        if (claimResult && claimResult.claimed && claimResult.org_id) {
          orgId = claimResult.org_id;
          isMember = true;
          const { data: org } = await supabase
            .from(TABLES.ORGANIZATIONS)
            .select(DB_KEYS.NAME)
            .eq(DB_KEYS.ID, orgId)
            .limit(1)
            .maybeSingle();
          orgName = org?.name ?? null;
        }
      } catch {
        // No invite or already claimed
      }
    }

    // If still no organization -> route to organization registration
    if (!orgId) {
      return {
        targetRoute: "/organization-registration",
        headline: null,
        orgName: null,
        isDomainVerified: false,
        isEmailVerified: false,
      };
    }

    // 2. Fetch user's professional headline
    const headline = await fetchUserHeadline(supabase, userId);

    // Invited member bypasses organization registration, domain verification, and email verification.
    // They only need to fill in remaining profile details (name, headline) in profile-setup.
    if (isMember) {
      return {
        targetRoute: headline ? "/home" : "/profile-setup",
        headline,
        orgName,
        isDomainVerified: true,
        isEmailVerified: true,
      };
    }

    // 3. Domain & Email verification checks for founder / owner
    const { domainVerified, emailVerified } =
      await getVerificationCompletionStatus(supabase, orgId);

    if (!domainVerified) {
      return {
        targetRoute: "/domain-verification",
        headline,
        orgName,
        isDomainVerified: false,
        isEmailVerified: false,
      };
    }

    if (!emailVerified) {
      return {
        targetRoute: "/email-verification",
        headline,
        orgName,
        isDomainVerified: true,
        isEmailVerified: false,
      };
    }

    // 4. Completed onboarding -> route to /home
    return {
      targetRoute: "/home",
      headline,
      orgName,
      isDomainVerified: true,
      isEmailVerified: true,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return createDefaultUnauthenticatedStatus();
  }
}
