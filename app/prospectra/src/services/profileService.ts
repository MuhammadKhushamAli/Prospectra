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
  const skills = params.skills || [];

  // 1. Resolve user's organization ID
  let orgId: string | null = null;
  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (member?.org_id) {
    orgId = member.org_id;
  } else {
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();
    if (org?.id) {
      orgId = org.id;
    }
  }

  if (!orgId) {
    throw new Error(
      "An active organization is required to save your profile.",
    );
  }

  // 2. Fetch existing profile to retain existing full_name if present
  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  const fullName =
    existingProfile?.full_name ||
    (user.email ? user.email.split("@")[0] : "");

  // 3. Upsert user profile into user_profiles table (No auth metadata)
  const { error: profileErr } = await supabase.from("user_profiles").upsert({
    org_id: orgId,
    user_id: user.id,
    full_name: fullName || null,
    headline: trimmedHeadline,
    email: user.email || null,
  });

  if (profileErr) throw profileErr;

  // 4. Sync skills into relational skills and user_skills tables (No auth metadata)
  const { data: currentLinks } = await supabase
    .from("user_skills")
    .select("skill_id")
    .eq("user_id", user.id);

  const existingLinkedIds = currentLinks?.map((c) => c.skill_id) || [];
  const targetSkillIds: string[] = [];

  for (const skillName of skills) {
    const cleanName = skillName.trim();
    if (!cleanName) continue;

    let skillId: string | null = null;

    // Check if skill already exists in this organization
    const { data: foundSkill } = await supabase
      .from("skills")
      .select("id")
      .eq("org_id", orgId)
      .ilike("name", cleanName)
      .limit(1)
      .maybeSingle();

    if (foundSkill?.id) {
      skillId = foundSkill.id;
    } else {
      const { data: insertedSkill, error: insertErr } = await supabase
        .from("skills")
        .insert({
          org_id: orgId,
          name: cleanName,
          category: "General",
        })
        .select("id")
        .single();

      if (!insertErr && insertedSkill?.id) {
        skillId = insertedSkill.id;
      } else if (insertErr) {
        console.warn("Skill insert notice:", insertErr.message);
      }
    }

    if (skillId) {
      targetSkillIds.push(skillId);
      await supabase.from("user_skills").upsert({
        user_id: user.id,
        skill_id: skillId,
      });
    }
  }

  // Remove any unselected skills from user_skills
  const toDelete = existingLinkedIds.filter(
    (id) => !targetSkillIds.includes(id),
  );
  if (toDelete.length > 0) {
    await supabase
      .from("user_skills")
      .delete()
      .eq("user_id", user.id)
      .in("skill_id", toDelete);
  }

  return {
    userId: user.id,
    fullName,
    email: user.email || "",
    headline: trimmedHeadline,
    skills,
    orgId,
  };
}

export async function getProfileFromSupabase(): Promise<UserProfileData | null> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error || !sessionData.session?.user) return null;

  const user = sessionData.session.user;

  // 1. Fetch user profile directly from user_profiles table (No auth metadata)
  const { data: profileRow } = await supabase
    .from("user_profiles")
    .select("org_id, headline, full_name, email")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  // 2. Fetch skills from user_skills and skills tables (No auth metadata)
  const { data: userSkillsRecords } = await supabase
    .from("user_skills")
    .select("skill_id")
    .eq("user_id", user.id);

  let skills: string[] = [];
  if (userSkillsRecords && userSkillsRecords.length > 0) {
    const skillIds = userSkillsRecords.map((r) => r.skill_id);
    const { data: skillsData } = await supabase
      .from("skills")
      .select("name")
      .in("id", skillIds);

    if (skillsData) {
      skills = skillsData.map((s) => s.name);
    }
  }

  if (profileRow) {
    return {
      userId: user.id,
      fullName:
        profileRow.full_name || (user.email ? user.email.split("@")[0] : ""),
      email: profileRow.email || user.email || "",
      headline: profileRow.headline || "",
      skills,
      orgId: profileRow.org_id,
    };
  }

  return null;
}
