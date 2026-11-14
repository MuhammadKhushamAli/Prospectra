import { getSupabaseClient } from "../../config/supabaseClient";
import { TABLES } from "../../constants/tables";
import { DB_KEYS } from "../../constants/dbKeys";

export interface VerificationCompletionStatus {
  domainVerified: boolean;
  emailVerified: boolean;
}

/**
 * Inspect whether domain ownership and email/SMTP verification are completed for an organization.
 */
export async function getVerificationCompletionStatus(
  supabase: ReturnType<typeof getSupabaseClient>,
  orgId: string,
): Promise<VerificationCompletionStatus> {
  const { data: domainRec } = await supabase
    .from(TABLES.DOMAIN_VERIFICATIONS)
    .select("*")
    .eq(DB_KEYS.ORG_ID, orgId)
    .limit(1)
    .maybeSingle();

  if (!domainRec || domainRec.verification_status !== "verified") {
    return { domainVerified: false, emailVerified: false };
  }

  const recAny = domainRec as Record<string, any>;
  const emailStatus =
    recAny.email_verification_status ||
    recAny.dns_records?.email_verification?.status;

  return {
    domainVerified: true,
    emailVerified: emailStatus === "verified",
  };
}

/**
 * Check whether both domain ownership and email/SMTP verification are completed for an organization.
 */
export async function isDomainVerified(
  supabase: ReturnType<typeof getSupabaseClient>,
  orgId: string,
): Promise<boolean> {
  const status = await getVerificationCompletionStatus(supabase, orgId);
  return status.domainVerified && status.emailVerified;
}
