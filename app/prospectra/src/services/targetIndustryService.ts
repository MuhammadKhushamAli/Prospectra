import { getSupabaseClient } from "../config/supabaseClient";
import { TABLES } from "../constants/tables";
import { DB_KEYS } from "../constants/dbKeys";

/**
 * Clean, trim, and deduplicate an array of industry names.
 */
export function sanitizeIndustries(industries: string[]): string[] {
  return Array.from(
    new Set(
      industries
        .map((i) => i.trim())
        .filter((i) => i.length > 0),
    ),
  );
}

/**
 * Retrieve the current authenticated user session or throw an error.
 */
export async function getAuthenticatedUser(supabase: ReturnType<typeof getSupabaseClient>) {
  const { data: sessionData, error: sessionErr } =
    await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const user = sessionData.session?.user;
  if (!user) throw new Error("No authenticated session found.");
  return user;
}

import { resolveUserOrgMembership } from "./onboarding/resolveUserOrgMembership";

/**
 * Resolve the user's active organization ID using shared membership resolution.
 */
export async function resolveUserOrgId(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
): Promise<string> {
  const { orgId } = await resolveUserOrgMembership(supabase, userId);
  if (orgId) {
    return orgId;
  }
  throw new Error("An active organization is required to save target industries.");
}

/**
 * Upsert or update target_industries for an organization and return its record ID.
 */
export async function upsertOrgTargetIndustries(
  supabase: ReturnType<typeof getSupabaseClient>,
  orgId: string,
  cleanedIndustries: string[],
): Promise<string> {
  const { data: existingTarget } = await supabase
    .from(TABLES.TARGET_INDUSTRIES)
    .select(DB_KEYS.ID)
    .eq(DB_KEYS.ORG_ID, orgId)
    .limit(1)
    .maybeSingle();

  if (existingTarget?.id) {
    const { error: updateErr } = await supabase
      .from(TABLES.TARGET_INDUSTRIES)
      .update({
        [DB_KEYS.TARGET_INDUSTRIES]: cleanedIndustries,
        [DB_KEYS.UPDATED_AT]: new Date().toISOString(),
      })
      .eq(DB_KEYS.ID, existingTarget.id);

    if (updateErr) throw updateErr;
    return existingTarget.id;
  }

  const { data: insertedTarget, error: insertErr } = await supabase
    .from(TABLES.TARGET_INDUSTRIES)
    .insert({
      [DB_KEYS.ORG_ID]: orgId,
      [DB_KEYS.TARGET_INDUSTRIES]: cleanedIndustries,
      [DB_KEYS.UPDATED_AT]: new Date().toISOString(),
    })
    .select(DB_KEYS.ID)
    .single();

  if (insertErr) throw insertErr;
  return insertedTarget.id;
}

/**
 * Link a user to a target_industries record in user_target_industries junction table.
 */
export async function linkUserTargetIndustry(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  targetIndustryId: string,
): Promise<void> {
  const { error: linkErr } = await supabase
    .from(TABLES.USER_TARGET_INDUSTRIES)
    .upsert({
      [DB_KEYS.USER_ID]: userId,
      [DB_KEYS.TARGET_INDUSTRY_ID]: targetIndustryId,
    });

  if (linkErr) throw linkErr;
}

/**
 * Fetch industries linked to a specific user via user_target_industries.
 */
export async function fetchUserLinkedTargetIndustries(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  orgId: string,
): Promise<string[]> {
  const { data: userLinks } = await supabase
    .from(TABLES.USER_TARGET_INDUSTRIES)
    .select(DB_KEYS.TARGET_INDUSTRY_ID)
    .eq(DB_KEYS.USER_ID, userId);

  if (!userLinks || userLinks.length === 0) return [];

  const targetIndustryIds = userLinks
    .map((l) => l.target_industry_id)
    .filter(Boolean);

  if (targetIndustryIds.length === 0) return [];

  const { data: targetRecords } = await supabase
    .from(TABLES.TARGET_INDUSTRIES)
    .select(DB_KEYS.TARGET_INDUSTRIES)
    .in(DB_KEYS.ID, targetIndustryIds)
    .eq(DB_KEYS.ORG_ID, orgId);

  if (!targetRecords || targetRecords.length === 0) return [];

  const combined = new Set<string>();
  for (const rec of targetRecords) {
    if (Array.isArray(rec.target_industries)) {
      rec.target_industries.forEach((ind: string) => combined.add(ind));
    }
  }
  return Array.from(combined);
}

/**
 * Fetch organization-level target industries as fallback.
 */
export async function fetchOrgFallbackTargetIndustries(
  supabase: ReturnType<typeof getSupabaseClient>,
  orgId: string,
): Promise<string[]> {
  const { data: orgTarget } = await supabase
    .from(TABLES.TARGET_INDUSTRIES)
    .select(DB_KEYS.TARGET_INDUSTRIES)
    .eq(DB_KEYS.ORG_ID, orgId)
    .limit(1)
    .maybeSingle();

  if (
    orgTarget?.target_industries &&
    Array.isArray(orgTarget.target_industries)
  ) {
    return orgTarget.target_industries;
  }
  return [];
}

/**
 * Saves the selected target industries for the user's active organization,
 * persisting to target_industries and linking via user_target_industries.
 */
export async function saveTargetIndustries(
  industries: string[],
): Promise<string[]> {
  const supabase = getSupabaseClient();
  const user = await getAuthenticatedUser(supabase);
  const cleanedIndustries = sanitizeIndustries(industries);

  if (cleanedIndustries.length === 0) {
    throw new Error("Please select at least one target industry.");
  }

  const orgId = await resolveUserOrgId(supabase, user.id);
  const targetIndustryId = await upsertOrgTargetIndustries(
    supabase,
    orgId,
    cleanedIndustries,
  );

  await linkUserTargetIndustry(supabase, user.id, targetIndustryId);

  return cleanedIndustries;
}

/**
 * Retrieves the currently saved target industries for the user's active organization
 * through user_target_industries junction table.
 */
export async function getTargetIndustries(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionErr } =
    await supabase.auth.getSession();
  if (sessionErr || !sessionData.session?.user) return [];
  const user = sessionData.session.user;

  let orgId: string | null = null;
  try {
    orgId = await resolveUserOrgId(supabase, user.id);
  } catch {
    return [];
  }

  // 1. Try user-linked target industries
  const userIndustries = await fetchUserLinkedTargetIndustries(
    supabase,
    user.id,
    orgId,
  );
  if (userIndustries.length > 0) {
    return userIndustries;
  }

  // 2. Fallback to organization level target industries
  return fetchOrgFallbackTargetIndustries(supabase, orgId);
}
