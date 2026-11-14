import { getSupabaseClient } from "../../config/supabaseClient";
import type { UserOnboardingStatus } from "../../types/onboarding";
import { createDefaultUnauthenticatedStatus } from "./createDefaultUnauthenticatedStatus";
import { resolveUserOrgMembership } from "./resolveUserOrgMembership";
import { fetchUserHeadline } from "./fetchUserHeadline";
import { getVerificationCompletionStatus } from "./isDomainVerified";

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
    const { orgId, orgName, isMember } = await resolveUserOrgMembership(
      supabase,
      userId,
    );

    // If no organization registered yet -> route to organization registration
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

    // Invited member bypasses domain verification
    if (isMember) {
      return {
        targetRoute: "/home",
        headline,
        orgName,
        isDomainVerified: true,
        isEmailVerified: true,
      };
    }

    // 3. Domain & Email verification checks
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
