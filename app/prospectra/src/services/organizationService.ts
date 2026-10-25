import { getSupabaseClient } from "../config/supabaseClient";
import { TABLES } from "../constants/tables";
import { DB_KEYS } from "../constants/dbKeys";
import type {
  Organization,
  RegisterOrganizationParams,
} from "../types/organization";

export type { Organization, RegisterOrganizationParams };

export async function registerOrganizationWithSupabase(
  params: RegisterOrganizationParams,
): Promise<Organization> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionErr } =
    await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const user = sessionData.session?.user;
  if (!user) throw new Error("No authenticated session found.");

  const trimmedName = params.name.trim();
  if (!trimmedName) throw new Error("Organization name is required.");

  const threshold =
    typeof params.pending_threshold === "number" &&
    !isNaN(params.pending_threshold) &&
    params.pending_threshold > 0
      ? Math.floor(params.pending_threshold)
      : 500;

  // Insert organization with current user as owner and specified company finder threshold
  const { data: orgData, error: orgErr } = await supabase
    .from(TABLES.ORGANIZATIONS)
    .insert({
      [DB_KEYS.NAME]: trimmedName,
      [DB_KEYS.OWNER_ID]: user.id,
      [DB_KEYS.PENDING_THRESHOLD]: threshold,
    })
    .select()
    .single();

  if (orgErr) throw orgErr;
  if (!orgData) throw new Error("Failed to create organization.");

  // Register user as founder member
  const { error: memberErr } = await supabase
    .from(TABLES.ORGANIZATION_MEMBERS)
    .insert({
      [DB_KEYS.ORG_ID]: orgData.id,
      [DB_KEYS.USER_ID]: user.id,
      [DB_KEYS.ROLE]: "founder",
    });

  if (memberErr) throw memberErr;

  // Store user profile with full name provided during signup
  const signupFullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    null;

  await supabase.from(TABLES.USER_PROFILES).upsert({
    [DB_KEYS.ORG_ID]: orgData.id,
    [DB_KEYS.USER_ID]: user.id,
    [DB_KEYS.FULL_NAME]: signupFullName,
    [DB_KEYS.EMAIL]: user.email || null,
  });

  return orgData as Organization;
}
