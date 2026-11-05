import { getSupabaseClient } from "../config/supabaseClient";
import { TABLES } from "../constants/tables";
import { DB_KEYS } from "../constants/dbKeys";
import { resolveUserOrgMembership } from "./onboarding/resolveUserOrgMembership";

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
export async function getAuthenticatedUser(
  supabase: ReturnType<typeof getSupabaseClient>,
) {
  const { data: sessionData, error: sessionErr } =
    await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const user = sessionData.session?.user;
  if (!user) throw new Error("No authenticated session found.");
  return user;
}

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
 * Find an existing target industry by name in the organization, or insert a new one.
 * Each industry has its own record and unique ID, exactly like skills in the skills table.
 */
export async function findOrCreateOrgTargetIndustry(
  supabase: ReturnType<typeof getSupabaseClient>,
  orgId: string,
  industryName: string,
): Promise<string | null> {
  const cleanName = industryName.trim();
  if (!cleanName) return null;

  const { data: foundIndustry } = await supabase
    .from(TABLES.TARGET_INDUSTRIES)
    .select(DB_KEYS.ID)
    .eq(DB_KEYS.ORG_ID, orgId)
    .ilike(DB_KEYS.NAME, cleanName)
    .limit(1)
    .maybeSingle();

  if (foundIndustry?.id) {
    return foundIndustry.id;
  }

  const { data: insertedIndustry, error: insertErr } = await supabase
    .from(TABLES.TARGET_INDUSTRIES)
    .insert({
      [DB_KEYS.ORG_ID]: orgId,
      [DB_KEYS.NAME]: cleanName,
    })
    .select(DB_KEYS.ID)
    .single();

  if (!insertErr && insertedIndustry?.id) {
    return insertedIndustry.id;
  }
  if (insertErr) {
    console.warn("Target industry insert notice:", insertErr.message);
  }
  return null;
}

/**
 * Sync user's target industries into target_industries and user_target_industries junction table.
 * Maintains the separated user-industry relationship, matching user_skills architecture.
 */
export async function syncUserTargetIndustriesList(
  supabase: ReturnType<typeof getSupabaseClient>,
  orgId: string,
  userId: string,
  industries: string[],
): Promise<void> {
  const { data: currentLinks } = await supabase
    .from(TABLES.USER_TARGET_INDUSTRIES)
    .select(DB_KEYS.TARGET_INDUSTRY_ID)
    .eq(DB_KEYS.USER_ID, userId);

  const existingLinkedIds =
    currentLinks?.map((c) => c.target_industry_id) || [];
  const targetIndustryIds: string[] = [];

  for (const industryName of industries) {
    const industryId = await findOrCreateOrgTargetIndustry(
      supabase,
      orgId,
      industryName,
    );
    if (industryId) {
      targetIndustryIds.push(industryId);
      await supabase.from(TABLES.USER_TARGET_INDUSTRIES).upsert({
        [DB_KEYS.USER_ID]: userId,
        [DB_KEYS.TARGET_INDUSTRY_ID]: industryId,
      });
    }
  }

  // Remove any unselected industries
  const toDelete = existingLinkedIds.filter(
    (id) => !targetIndustryIds.includes(id),
  );
  if (toDelete.length > 0) {
    await supabase
      .from(TABLES.USER_TARGET_INDUSTRIES)
      .delete()
      .eq(DB_KEYS.USER_ID, userId)
      .in(DB_KEYS.TARGET_INDUSTRY_ID, toDelete);
  }
}

/**
 * Fetch target industry names associated with a user via user_target_industries.
 */
export async function fetchUserTargetIndustryNames(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
): Promise<string[]> {
  const { data: userIndustryRecords } = await supabase
    .from(TABLES.USER_TARGET_INDUSTRIES)
    .select(DB_KEYS.TARGET_INDUSTRY_ID)
    .eq(DB_KEYS.USER_ID, userId);

  if (!userIndustryRecords || userIndustryRecords.length === 0) return [];

  const industryIds = userIndustryRecords
    .map((r) => r.target_industry_id)
    .filter(Boolean);

  if (industryIds.length === 0) return [];

  const { data: industriesData } = await supabase
    .from(TABLES.TARGET_INDUSTRIES)
    .select(DB_KEYS.NAME)
    .in(DB_KEYS.ID, industryIds);

  return industriesData ? industriesData.map((s) => s.name).filter(Boolean) : [];
}

/**
 * Legacy compatibility alias for fetching user-linked target industries.
 */
export async function fetchUserLinkedTargetIndustries(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  _orgId?: string,
): Promise<string[]> {
  return fetchUserTargetIndustryNames(supabase, userId);
}

/**
 * Fetch organization-level target industries as fallback.
 */
export async function fetchOrgFallbackTargetIndustries(
  supabase: ReturnType<typeof getSupabaseClient>,
  orgId: string,
): Promise<string[]> {
  const { data: orgIndustries } = await supabase
    .from(TABLES.TARGET_INDUSTRIES)
    .select(DB_KEYS.NAME)
    .eq(DB_KEYS.ORG_ID, orgId);

  if (!orgIndustries || orgIndustries.length === 0) return [];
  return orgIndustries.map((r) => r.name).filter(Boolean);
}

/**
 * Saves the selected target industries for the user's active organization,
 * ensuring each industry has its own record in target_industries and maintaining
 * the separated user-industry relationship in user_target_industries.
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
  await syncUserTargetIndustriesList(
    supabase,
    orgId,
    user.id,
    cleanedIndustries,
  );

  return cleanedIndustries;
}

/**
 * Retrieves the currently saved target industries for the user
 * through the user_target_industries junction table, with fallback to org industries.
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
  const userIndustries = await fetchUserTargetIndustryNames(
    supabase,
    user.id,
  );
  if (userIndustries.length > 0) {
    return userIndustries;
  }

  // 2. Fallback to organization level target industries
  return fetchOrgFallbackTargetIndustries(supabase, orgId);
}

/**
 * Legacy compatibility alias for linking a user to a target industry.
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
 * Legacy compatibility alias for upserting an organization target industry.
 */
export async function upsertOrgTargetIndustries(
  supabase: ReturnType<typeof getSupabaseClient>,
  orgId: string,
  cleanedIndustries: string[],
): Promise<string> {
  let firstId: string | null = null;
  for (const name of cleanedIndustries) {
    const id = await findOrCreateOrgTargetIndustry(supabase, orgId, name);
    if (!firstId && id) {
      firstId = id;
    }
  }
  return firstId || "";
}
