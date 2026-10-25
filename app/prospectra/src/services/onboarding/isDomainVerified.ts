import { getSupabaseClient } from "../../config/supabaseClient";
import { TABLES } from "../../constants/tables";
import { DB_KEYS } from "../../constants/dbKeys";

/**
 * Check whether domain verification is completed for an organization.
 */
export async function isDomainVerified(
  supabase: ReturnType<typeof getSupabaseClient>,
  orgId: string,
): Promise<boolean> {
  const { data: domainRec } = await supabase
    .from(TABLES.DOMAIN_VERIFICATIONS)
    .select(DB_KEYS.VERIFICATION_STATUS)
    .eq(DB_KEYS.ORG_ID, orgId)
    .limit(1)
    .maybeSingle();

  return domainRec?.verification_status === "verified";
}
