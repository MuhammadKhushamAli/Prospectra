import { getSupabaseClient } from "../config/supabaseClient";
import { TABLES } from "../constants/tables";
import { DB_KEYS } from "../constants/dbKeys";
import type { UserProject } from "../types/projects";

/**
 * Fetch projects saved by the user in the database.
 */
export async function fetchUserProjects(
  userId: string,
  orgId: string,
): Promise<UserProject[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLES.PROJECTS)
    .select("*")
    .eq(DB_KEYS.USER_ID, userId)
    .eq(DB_KEYS.ORG_ID, orgId)
    .order(DB_KEYS.CREATED_AT, { ascending: false });

  if (error) {
    console.error("Error fetching user projects:", error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    techStack: row.tech_stack || [],
    liveDemoUrl: row.live_demo_url || null,
    repoUrl: row.repo_url || null,
    isImportedFromGithub: Boolean(row.repo_url),
  }));
}

/**
 * Save / sync the user's project list to Supabase.
 * Replaces existing records or bulk upserts projects for this user and organization.
 */
export async function saveUserProjects(
  userId: string,
  orgId: string,
  projects: UserProject[],
): Promise<void> {
  const supabase = getSupabaseClient();

  // 1. Delete existing projects for this user in the org to synchronize
  const { error: deleteError } = await supabase
    .from(TABLES.PROJECTS)
    .delete()
    .eq(DB_KEYS.USER_ID, userId)
    .eq(DB_KEYS.ORG_ID, orgId);

  if (deleteError) {
    console.error("Error removing old projects:", deleteError);
    throw deleteError;
  }

  if (projects.length === 0) {
    return;
  }

  // 2. Insert new projects
  const rows = projects.map((p) => ({
    [DB_KEYS.ORG_ID]: orgId,
    [DB_KEYS.USER_ID]: userId,
    [DB_KEYS.TITLE]: p.title.trim(),
    [DB_KEYS.DESCRIPTION]: p.description.trim(),
    [DB_KEYS.TECH_STACK]: p.techStack || [],
    [DB_KEYS.LIVE_DEMO_URL]: p.liveDemoUrl?.trim() || null,
    [DB_KEYS.REPO_URL]: p.repoUrl?.trim() || null,
  }));

  const { error: insertError } = await supabase
    .from(TABLES.PROJECTS)
    .insert(rows);

  if (insertError) {
    console.error("Error inserting projects:", insertError);
    throw insertError;
  }
}

/**
 * Delete a single project by ID.
 */
export async function deleteUserProject(projectId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(TABLES.PROJECTS)
    .delete()
    .eq(DB_KEYS.ID, projectId);

  if (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
}
