import { getSupabaseClient } from "../config/supabaseClient";
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
    .from("organizations")
    .insert({
      name: trimmedName,
      owner_id: user.id,
      pending_threshold: threshold,
    })
    .select()
    .single();

  if (orgErr) throw orgErr;
  if (!orgData) throw new Error("Failed to create organization.");

  // Register user as founder member
  const { error: memberErr } = await supabase
    .from("organization_members")
    .insert({
      org_id: orgData.id,
      user_id: user.id,
      role: "founder",
    });

  if (memberErr) throw memberErr;

  return orgData as Organization;
}
