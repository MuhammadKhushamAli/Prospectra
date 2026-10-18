import type { tMemberRole } from "./orgMembers";

const onboardingRoutes = [
  "/auth",
  "/profile-setup",
  "/organization-registration",
  "/domain-verification",
  "/home",
] as const;

type tOnboardingRoute = typeof onboardingRoutes[number];

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

export type {
  tOnboardingRoute,
  UserOnboardingStatus,
};

export {
  onboardingRoutes,
};
