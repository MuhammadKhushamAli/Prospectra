import type { UserOnboardingStatus } from "../../types/onboarding";

/**
 * Return default unauthenticated onboarding status.
 */
export function createDefaultUnauthenticatedStatus(): UserOnboardingStatus {
  return {
    targetRoute: "/auth",
    headline: null,
    orgName: null,
    isDomainVerified: false,
    isEmailVerified: false,
  };
}
