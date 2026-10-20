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

  // Insert organization with current user as owner
  const { data: orgData, error: orgErr } = await supabase
    .from("organizations")
    .insert({
      name: trimmedName,
      owner_id: user.id,
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

  // Sync user profile to user_profiles table and skills tables
  try {
    await supabase.from("user_profiles").upsert({
      org_id: orgData.id,
      user_id: user.id,
      full_name: (user.user_metadata?.full_name as string) || null,
      headline: (user.user_metadata?.headline as string) || null,
      email: user.email || null,
    });

    const userSkills = (user.user_metadata?.skills as string[]) || [];
    if (userSkills.length > 0) {
      for (const skillName of userSkills) {
        try {
          const { data: skillRow } = await supabase
            .from("skills")
            .insert({
              org_id: orgData.id,
              name: skillName,
              description: skillName,
              category: "General",
            })
            .select("id")
            .single();

          if (skillRow?.id) {
            await supabase.from("user_skills").upsert({
              user_id: user.id,
              skill_id: skillRow.id,
            });
          }
        } catch {
          // Non-fatal if skill already exists or insert fails
        }
      }
    }
  } catch (profileErr) {
    console.warn("Could not sync user_profiles on organization registration:", profileErr);
  }

  return orgData as Organization;
}
