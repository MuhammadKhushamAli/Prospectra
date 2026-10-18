import { getSupabaseClient } from "../config/supabaseClient";
import type {
  UpdateProfileParams,
  UserProfileData,
} from "../types/profile";

export type { UpdateProfileParams, UserProfileData };

export async function updateProfileWithSupabase(
  params: UpdateProfileParams,
): Promise<UserProfileData> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionErr } =
    await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const user = sessionData.session?.user;
  if (!user) throw new Error("No authenticated session found.");

  const trimmedHeadline = params.headline.trim();
  if (!trimmedHeadline) throw new Error("Professional headline is required.");

  // 1. Update Supabase Auth user metadata
  const { data: updateData, error: updateErr } = await supabase.auth.updateUser({
    data: {
      headline: trimmedHeadline,
      profile_completed: true,
    },
  });

  if (updateErr) throw updateErr;
  const updatedUser = updateData.user ?? user;

  // 2. If user is already part of an organization, sync to user_profiles table
  try {
    const { data: member } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const orgId = member?.org_id;
    if (orgId) {
      await supabase.from("user_profiles").upsert({
        org_id: orgId,
        user_id: user.id,
        full_name: (updatedUser.user_metadata?.full_name as string) || null,
        headline: trimmedHeadline,
        email: updatedUser.email || null,
      });
    }
  } catch (syncErr) {
    // Non-fatal if organization does not exist yet
    console.warn("Notice: user_profiles sync deferred until organization creation:", syncErr);
  }

  return {
    userId: updatedUser.id,
    fullName: (updatedUser.user_metadata?.full_name as string) || "",
    email: updatedUser.email || "",
    headline: trimmedHeadline,
  };
}

export async function getProfileFromSupabase(): Promise<UserProfileData | null> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error || !sessionData.session?.user) return null;

  const user = sessionData.session.user;
  const metadataHeadline = (user.user_metadata?.headline as string) || "";

  if (metadataHeadline) {
    return {
      userId: user.id,
      fullName: (user.user_metadata?.full_name as string) || "",
      email: user.email || "",
      headline: metadataHeadline,
    };
  }

  // Fallback: check user_profiles table if user metadata is not yet populated
  const { data: profileRow } = await supabase
    .from("user_profiles")
    .select("headline, full_name, email")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (profileRow?.headline) {
    return {
      userId: user.id,
      fullName: profileRow.full_name || (user.user_metadata?.full_name as string) || "",
      email: profileRow.email || user.email || "",
      headline: profileRow.headline,
    };
  }

  return null;
}
