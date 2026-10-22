import { onboardingRoutes } from "../../constants/onboarding";
import type { tMemberRole } from "../orgMembers";

type tOnboardingRoute = (typeof onboardingRoutes)[number];

interface UserOnboardingStatus {
  isAuthenticated: boolean;
  hasProfile: boolean;
  headline: string | null;
  hasOrganization: boolean;
  orgId: string | null;
  orgName?: string | null;
  role?: tMemberRole | null;
  hasVerifiedDomain: boolean;
  domain: string | null;
  targetRoute: tOnboardingRoute;
}

export type { tOnboardingRoute, UserOnboardingStatus };

// Re-export runtime constant for backward compatibility
export { onboardingRoutes };
