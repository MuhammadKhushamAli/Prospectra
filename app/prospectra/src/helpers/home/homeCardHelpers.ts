/**
 * Helper functions for the Home screen and digital User ID Card.
 */

import { getSupabaseClient } from "../../config/supabaseClient";
import { DB_KEYS } from "../../constants/dbKeys";
import { TABLES } from "../../constants/tables";
import { resolveUserOrgMembership } from "../../services/onboardingService";
import { fetchProfileFullNameFromDb } from "../../services/profileService";
import type { UserOnboardingStatus } from "../../types/onboarding";
import type { UserIdCardProfile } from "../../types/profile";

/**
 * Fetch and construct the digital User ID Card profile data from Supabase.
 */
export async function fetchUserIdCardProfile(
  userId: string,
  fallbackName: string | null,
  fallbackEmail: string | null,
  onboarding: UserOnboardingStatus,
): Promise<UserIdCardProfile> {
  const supabase = getSupabaseClient();

  // 1. Fetch user full name from user_profiles or fallback to auth metadata
  const dbFullName = await fetchProfileFullNameFromDb(supabase, userId).catch(
    () => null,
  );
  const name = dbFullName || fallbackName;

  // 2. Role in organization (professional headline configured in profile setup)
  const role = onboarding.headline ?? null;

  // 3. Resolve organization ID and name fresh from DB
  const { orgId, orgName: resolvedOrgName } = await resolveUserOrgMembership(
    supabase,
    userId,
  );
  const organizationName = resolvedOrgName || onboarding.orgName || null;

  // 4. Fetch verified organization domain from DB
  let organizationDomain: string | null = null;
  if (orgId) {
    const { data: domainRec } = await supabase
      .from(TABLES.DOMAIN_VERIFICATIONS)
      .select(DB_KEYS.DOMAIN)
      .eq(DB_KEYS.ORG_ID, orgId)
      .limit(1)
      .maybeSingle();
    organizationDomain = domainRec?.domain ?? null;
  }

  return {
    name,
    organizationName,
    organizationDomain,
    email: fallbackEmail,
    role,
  };
}

/**
 * Get formatted display role for a user card profile.
 */
export function formatCardRole(role: string | null | undefined): string {
  if (!role || !role.trim()) return "Member";
  return role.trim();
}

/**
 * Format member ID code string based on user ID.
 */
export function formatMemberId(userId: string | null | undefined): string {
  if (!userId) return "PROSP-00000";
  const clean = userId.replace(/-/g, "").toUpperCase();
  return `PROSP-${clean.slice(0, 6)}`;
}
