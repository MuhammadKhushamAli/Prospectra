import { getSupabaseClient } from "../config/supabaseClient";
import { TABLES } from "../constants/tables";

/**
 * Saves the selected target industries for the user's active organization.
 */
export async function saveTargetIndustries(
  industries: string[],
): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionErr } =
    await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const user = sessionData.session?.user;
  if (!user) throw new Error("No authenticated session found.");

  const cleanedIndustries = Array.from(
    new Set(
      industries
        .map((i) => i.trim())
        .filter((i) => i.length > 0),
    ),
  );

  if (cleanedIndustries.length === 0) {
    throw new Error("Please select at least one target industry.");
  }

  // 1. Resolve user's organization ID
  let orgId: string | null = null;
  const { data: member } = await supabase
    .from(TABLES.ORGANIZATION_MEMBERS)
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (member?.org_id) {
    orgId = member.org_id;
  } 
  if (!orgId) {
    throw new Error("An active organization is required to save target industries.");
  }

  // 2. Upsert into target_industries table (Primary key: user_id, org_id)
  const { error: upsertErr } = await supabase
    .from(TABLES.TARGET_INDUSTRIES)
    .upsert(
      {
        user_id: user.id,
        org_id: orgId,
        target_industries: cleanedIndustries,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,org_id" },
    );

  if (upsertErr) throw upsertErr;

  return cleanedIndustries;
}

/**
 * Retrieves the currently saved target industries for the user's active organization.
 */
export async function getTargetIndustries(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionErr } =
    await supabase.auth.getSession();
  if (sessionErr || !sessionData.session?.user) return [];
  const user = sessionData.session.user;

  // Resolve user's organization ID
  let orgId: string | null = null;
  const { data: member } = await supabase
    .from(TABLES.ORGANIZATION_MEMBERS)
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (member?.org_id) {
    orgId = member.org_id;
  }

  if (!orgId) return [];

  const { data: targetRecord } = await supabase
    .from(TABLES.TARGET_INDUSTRIES)
    .select("target_industries")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (
    targetRecord?.target_industries &&
    Array.isArray(targetRecord.target_industries)
  ) {
    return targetRecord.target_industries;
  }

  return [];
}
