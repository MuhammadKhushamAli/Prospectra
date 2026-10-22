/**
 * Supabase Table Names picked from environment variables with safe string fallbacks.
 */
export const TABLES = {
  ORGANIZATIONS: (process.env.EXPO_PUBLIC_ORGANIZATIONS_TABLE || "organizations") as string,
  ORGANIZATION_MEMBERS: (process.env.EXPO_PUBLIC_ORGANIZATION_MEMBERS_TABLE || "organization_members") as string,
  USER_PROFILES: (process.env.EXPO_PUBLIC_USER_PROFILES_TABLE || "user_profiles") as string,
  SKILLS: (process.env.EXPO_PUBLIC_SKILLS_TABLE || "skills") as string,
  USER_SKILLS: (process.env.EXPO_PUBLIC_USER_SKILLS_TABLE || "user_skills") as string,
  DOMAIN_VERIFICATIONS: (process.env.EXPO_PUBLIC_DOMAIN_VERIFICATIONS_TABLE || "domain_verifications") as string,
  COMPANIES: (process.env.EXPO_PUBLIC_COMPANIES_TABLE || "companies") as string,
  EMAILS: (process.env.EXPO_PUBLIC_EMAILS_TABLE || "emails") as string,
  SEARCH_PROGRESS: (process.env.EXPO_PUBLIC_SEARCH_PROGRESS_TABLE || "search_progress") as string,
} as const;
