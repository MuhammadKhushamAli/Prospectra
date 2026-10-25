import { getSupabaseClient } from "../config/supabaseClient";
import { TABLES } from "../constants/tables";
import { DB_KEYS } from "../constants/dbKeys";
import type {
  UpdateProfileParams,
  UserProfileData,
} from "../types/profile";

export type { UpdateProfileParams, UserProfileData };

/**
 * Validate and sanitize the professional headline.
 */
export function validateHeadline(headline: string): string {
  const trimmed = headline.trim();
  if (!trimmed) throw new Error("Professional headline is required.");
  return trimmed;
}

import { resolveUserOrgMembership } from "./onboarding/resolveUserOrgMembership";
import { fetchUserHeadline } from "./onboarding/fetchUserHeadline";

export { fetchUserHeadline };

/**
 * Resolve user's active organization ID from member table or owned organization.
 */
export async function resolveProfileOrgId(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
): Promise<string> {
  const { orgId } = await resolveUserOrgMembership(supabase, userId);
  if (orgId) {
    return orgId;
  }

  throw new Error("An active organization is required to save your profile.");
}

/**
 * Fetch the existing profile full name if present.
 */
export async function fetchExistingProfileFullName(
  supabase: ReturnType<typeof getSupabaseClient>,
  orgId: string,
  userId: string,
): Promise<string | null> {
  const { data: existingProfile } = await supabase
    .from(TABLES.USER_PROFILES)
    .select(DB_KEYS.FULL_NAME)
    .eq(DB_KEYS.ORG_ID, orgId)
    .eq(DB_KEYS.USER_ID, userId)
    .maybeSingle();

  return existingProfile?.full_name || null;
}

/**
 * Upsert user profile row into user_profiles table.
 */
export async function upsertProfileRecord(
  supabase: ReturnType<typeof getSupabaseClient>,
  record: {
    orgId: string;
    userId: string;
    fullName: string | null;
    headline: string;
    email: string | null;
  },
): Promise<void> {
  const { error: profileErr } = await supabase.from(TABLES.USER_PROFILES).upsert({
    [DB_KEYS.ORG_ID]: record.orgId,
    [DB_KEYS.USER_ID]: record.userId,
    [DB_KEYS.FULL_NAME]: record.fullName,
    [DB_KEYS.HEADLINE]: record.headline,
    [DB_KEYS.EMAIL]: record.email,
  });

  if (profileErr) throw profileErr;
}

/**
 * Find an existing skill by name in the organization, or insert a new one.
 */
export async function findOrCreateOrgSkill(
  supabase: ReturnType<typeof getSupabaseClient>,
  orgId: string,
  skillName: string,
): Promise<string | null> {
  const cleanName = skillName.trim();
  if (!cleanName) return null;

  const { data: foundSkill } = await supabase
    .from(TABLES.SKILLS)
    .select(DB_KEYS.ID)
    .eq(DB_KEYS.ORG_ID, orgId)
    .ilike(DB_KEYS.NAME, cleanName)
    .limit(1)
    .maybeSingle();

  if (foundSkill?.id) {
    return foundSkill.id;
  }

  const { data: insertedSkill, error: insertErr } = await supabase
    .from(TABLES.SKILLS)
    .insert({
      [DB_KEYS.ORG_ID]: orgId,
      [DB_KEYS.NAME]: cleanName,
    })
    .select(DB_KEYS.ID)
    .single();

  if (!insertErr && insertedSkill?.id) {
    return insertedSkill.id;
  }
  if (insertErr) {
    console.warn("Skill insert notice:", insertErr.message);
  }
  return null;
}

/**
 * Sync user's skills into skills and user_skills junction table.
 */
export async function syncUserSkillsList(
  supabase: ReturnType<typeof getSupabaseClient>,
  orgId: string,
  userId: string,
  skills: string[],
): Promise<void> {
  const { data: currentLinks } = await supabase
    .from(TABLES.USER_SKILLS)
    .select(DB_KEYS.SKILL_ID)
    .eq(DB_KEYS.USER_ID, userId);

  const existingLinkedIds = currentLinks?.map((c) => c.skill_id) || [];
  const targetSkillIds: string[] = [];

  for (const skillName of skills) {
    const skillId = await findOrCreateOrgSkill(supabase, orgId, skillName);
    if (skillId) {
      targetSkillIds.push(skillId);
      await supabase.from(TABLES.USER_SKILLS).upsert({
        [DB_KEYS.USER_ID]: userId,
        [DB_KEYS.SKILL_ID]: skillId,
      });
    }
  }

  // Remove any unselected skills
  const toDelete = existingLinkedIds.filter(
    (id) => !targetSkillIds.includes(id),
  );
  if (toDelete.length > 0) {
    await supabase
      .from(TABLES.USER_SKILLS)
      .delete()
      .eq(DB_KEYS.USER_ID, userId)
      .in(DB_KEYS.SKILL_ID, toDelete);
  }
}

/**
 * Fetch skill names associated with a user via user_skills.
 */
export async function fetchUserSkillNames(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
): Promise<string[]> {
  const { data: userSkillsRecords } = await supabase
    .from(TABLES.USER_SKILLS)
    .select(DB_KEYS.SKILL_ID)
    .eq(DB_KEYS.USER_ID, userId);

  if (!userSkillsRecords || userSkillsRecords.length === 0) return [];

  const skillIds = userSkillsRecords.map((r) => r.skill_id);
  const { data: skillsData } = await supabase
    .from(TABLES.SKILLS)
    .select(DB_KEYS.NAME)
    .in(DB_KEYS.ID, skillIds);

  return skillsData ? skillsData.map((s) => s.name) : [];
}

/**
 * Update user profile and skills in Supabase.
 */
export async function updateProfileWithSupabase(
  params: UpdateProfileParams,
): Promise<UserProfileData> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionErr } =
    await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const user = sessionData.session?.user;
  if (!user) throw new Error("No authenticated session found.");

  const trimmedHeadline = validateHeadline(params.headline);
  const skills = params.skills || [];
  const orgId = await resolveProfileOrgId(supabase, user.id);

  const existingFullName = await fetchExistingProfileFullName(
    supabase,
    orgId,
    user.id,
  );
  const fullName = params.fullName?.trim() || existingFullName || "";

  await upsertProfileRecord(supabase, {
    orgId,
    userId: user.id,
    fullName,
    headline: trimmedHeadline,
    email: user.email || null,
  });

  await syncUserSkillsList(supabase, orgId, user.id, skills);

  return {
    userId: user.id,
    fullName,
    email: user.email || "",
    headline: trimmedHeadline,
    skills,
    orgId,
  };
}

/**
 * Fetch current user profile and skills from Supabase.
 */
export async function getProfileFromSupabase(): Promise<UserProfileData | null> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error || !sessionData.session?.user) return null;

  const user = sessionData.session.user;

  const { data: profileRow } = await supabase
    .from(TABLES.USER_PROFILES)
    .select(`${DB_KEYS.ORG_ID}, ${DB_KEYS.HEADLINE}, ${DB_KEYS.FULL_NAME}, ${DB_KEYS.EMAIL}`)
    .eq(DB_KEYS.USER_ID, user.id)
    .limit(1)
    .maybeSingle();

  const skills = await fetchUserSkillNames(supabase, user.id);

  if (profileRow) {
    return {
      userId: user.id,
      fullName: profileRow.full_name || "",
      email: profileRow.email || user.email || "",
      headline: profileRow.headline || "",
      skills,
      orgId: profileRow.org_id,
    };
  }

  return null;
}
