import { getSupabaseClient } from "../../config/supabaseClient";
import { TABLES } from "../../constants/tables";
import { DB_KEYS } from "../../constants/dbKeys";

/**
 * Fetch professional headline for a user from user_profiles table.
 */
export async function fetchUserHeadline(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from(TABLES.USER_PROFILES)
    .select(DB_KEYS.HEADLINE)
    .eq(DB_KEYS.USER_ID, userId)
    .limit(1)
    .maybeSingle();

  return profile?.headline ?? null;
}
