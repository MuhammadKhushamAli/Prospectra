/**
 * Supabase Table Names picked from environment variables with safe string fallbacks.
 */
export const TABLES = {
  ORGANIZATIONS: (process.env.EXPO_PUBLIC_ORGANIZATIONS_TABLE || "organizations") as string,
  ORGANIZATION_MEMBERS: (process.env.EXPO_PUBLIC_ORGANIZATION_MEMBERS_TABLE || "organization_members") as string,
  ORGANIZATION_INVITES: (process.env.EXPO_PUBLIC_ORGANIZATION_INVITES_TABLE || "organization_invites") as string,
  ORG_APPROVALS: (process.env.EXPO_PUBLIC_ORG_APPROVALS_TABLE || "org_approvals") as string,
  ORG_ACTIVITY_EVENTS: (process.env.EXPO_PUBLIC_ORG_ACTIVITY_EVENTS_TABLE || "org_activity_events") as string,
  USER_PROFILES: (process.env.EXPO_PUBLIC_USER_PROFILES_TABLE || "user_profiles") as string,
  SKILLS: (process.env.EXPO_PUBLIC_SKILLS_TABLE || "skills") as string,
  USER_SKILLS: (process.env.EXPO_PUBLIC_USER_SKILLS_TABLE || "user_skills") as string,
  DOMAIN_VERIFICATIONS: (process.env.EXPO_PUBLIC_DOMAIN_VERIFICATIONS_TABLE || "domain_verifications") as string,
  COMPANIES: (process.env.EXPO_PUBLIC_COMPANIES_TABLE || "companies") as string,
  CONTACTS: (process.env.EXPO_PUBLIC_CONTACTS_TABLE || "contacts") as string,
  EMAILS: (process.env.EXPO_PUBLIC_EMAILS_TABLE || "emails") as string,
  SEARCH_PROGRESS: (process.env.EXPO_PUBLIC_SEARCH_PROGRESS_TABLE || "search_progress") as string,
  SEARCH_PROGRESS_SKILLS: (process.env.EXPO_PUBLIC_SEARCH_PROGRESS_SKILLS_TABLE || "search_progress_skills") as string,
  SEARCH_PROGRESS_INDUSTRIES: (process.env.EXPO_PUBLIC_SEARCH_PROGRESS_INDUSTRIES_TABLE || "search_progress_industries") as string,
  TARGET_INDUSTRIES: (process.env.EXPO_PUBLIC_TARGET_INDUSTRIES_TABLE || "target_industries") as string,
  USER_TARGET_INDUSTRIES: (process.env.EXPO_PUBLIC_USER_TARGET_INDUSTRIES_TABLE || "user_target_industries") as string,
  PROJECTS: (process.env.EXPO_PUBLIC_PROJECTS_TABLE || "projects") as string,
} as const;
