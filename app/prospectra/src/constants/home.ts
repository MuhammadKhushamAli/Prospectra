/**
 * Constants for the Home screen and digital User ID Card.
 */

export const HOME_CARD_CONSTANTS = {
  ASPECT_RATIO: 1.586, // Standard CR80 credit / ID card ratio
  BORDER_RADIUS: 20,
  SHADOW_OPACITY: 0.28,
  SHADOW_RADIUS: 24,
  ELEVATION: 16,
  SPRING_CONFIG: {
    damping: 18,
    stiffness: 120,
    mass: 0.9,
  },
  AUTO_TILT_ANGLE: 4.5,
  AUTO_TILT_DURATION: 3200,
  FLIP_DURATION: 420,
} as const;

export const HOME_LABELS = {
  TITLE: "Dashboard",
  SUBTITLE: "Manage your prospecting, outreach, and team.",
  FLIP_HINT: "Tap or swipe card to flip",
  ORG_UNRESOLVED: "No Organization",
  DOMAIN_UNVERIFIED: "Domain Unverified",
  ROLE_DEFAULT: "Member",
  QR_DESCRIPTION: "Verified Prospectra Member ID",
  SCAN_HINT: "Scan to verify organization membership",
  SIGN_OUT_LABEL: "Sign Out",
  SIGN_OUT_CONFIRM: "Are you sure you want to sign out?",
} as const;

export const HOME_NAV_ITEMS = [
  {
    key: "prospecting",
    title: "Prospecting",
    description: "Discover companies and review outreach leads",
    route: "/prospecting",
    icon: "Building2",
  },
  {
    key: "projects",
    title: "Projects",
    description: "Manage portfolio and sync GitHub repositories",
    route: "/projects",
    icon: "Briefcase",
  },
  {
    key: "industries",
    title: "Target Industries",
    description: "Configure industry and vertical preferences",
    route: "/target-industries",
    icon: "Target",
  },
  {
    key: "profile",
    title: "Profile Setup",
    description: "Update personal headline, skills, and bio",
    route: "/profile-setup",
    icon: "User",
  },
  {
    key: "team",
    title: "Team Management",
    description: "Invite teammates, manage roles, and review approvals",
    route: "/admin",
    icon: "Users",
    founderOnly: true,
  },
] as const;
