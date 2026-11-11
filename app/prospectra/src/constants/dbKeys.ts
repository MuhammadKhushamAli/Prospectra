/**
 * Database Column and Field Keys used across Supabase queries, mutations, and models.
 */
export const DB_KEYS = {
  // Identifiers & Core
  ID: "id",
  USER_ID: "user_id",
  ORG_ID: "org_id",
  OWNER_ID: "owner_id",
  CREATED_AT: "created_at",
  UPDATED_AT: "updated_at",

  // Organization
  NAME: "name",
  ROLE: "role",
  PENDING_THRESHOLD: "pending_threshold",

  // Profile & User
  FULL_NAME: "full_name",
  HEADLINE: "headline",
  EMAIL: "email",
  GITHUB_URL: "github_url",
  LINKEDIN_URL: "linkedin_url",

  // Domain Verification
  DOMAIN: "domain",
  VERIFICATION_STATUS: "verification_status",
  DNS_RECORDS: "dns_records",

  // Skills
  SKILL_ID: "skill_id",

  // Target Industries
  TARGET_INDUSTRIES: "target_industries",
  TARGET_INDUSTRY_ID: "target_industry_id",
  INDUSTRY_ID: "industry_id",

  // Projects
  TITLE: "title",
  TECH_STACK: "tech_stack",
  LIVE_DEMO_URL: "live_demo_url",
  REPO_URL: "repo_url",

  // Search Progress
  QUERY: "query",
  SOURCE: "source",
  STATUS: "status",
  CURRENT_PAGE: "current_page",
  TOTAL_PAGES: "total_pages",
  COMPANIES_FETCHED: "companies_fetched",
  LAST_FETCHED_AT: "last_fetched_at",
  SEARCH_PROGRESS_ID: "search_progress_id",

  // Companies & Emails
  INDUSTRY: "industry",
  DESCRIPTION: "description",
  VERIFIED: "verified",
  COMPANY_ID: "company_id",
  SENT_BY_ORG_ID: "sent_by_org_id",
  SENT_BY_USER_ID: "sent_by_user_id",
  RECIPIENT_EMAIL: "recipient_email",
  SUBJECT: "subject",
  BODY: "body",
  REVIEW_SCORE: "review_score",
  REVIEW_FEEDBACK: "review_feedback",
  SENT_AT: "sent_at",
} as const;

export type DBKey = (typeof DB_KEYS)[keyof typeof DB_KEYS];

// Alias for convenience
export const dbKeys = DB_KEYS;
