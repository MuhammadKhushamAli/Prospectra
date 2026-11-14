import { onboardingRoutes } from "../../constants/onboarding";

type tOnboardingRoute = (typeof onboardingRoutes)[number];

interface UserOnboardingStatus {
  targetRoute: tOnboardingRoute;
  headline: string | null;
  orgName: string | null;
  isDomainVerified?: boolean;
  isEmailVerified?: boolean;
}

export type { tOnboardingRoute, UserOnboardingStatus };

// Re-export runtime constant for backward compatibility
export { onboardingRoutes };
