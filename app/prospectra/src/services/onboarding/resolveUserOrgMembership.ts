import { getSupabaseClient } from "../../config/supabaseClient";
import { TABLES } from "../../constants/tables";
import { DB_KEYS } from "../../constants/dbKeys";
import type { OrganizationMember } from "../../types/orgMembers";
import { memberRoles } from "../../types/orgMembers";

export interface UserOrgMembershipResult {
  orgId: string | null;
  orgName: string | null;
  isMember: boolean;
}

/**
 * Resolve user's organization membership ID, company name, and role.
 */
export async function resolveUserOrgMembership(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
): Promise<UserOrgMembershipResult> {
  const { data: member } = await supabase
    .from(TABLES.ORGANIZATION_MEMBERS)
    .select(`${DB_KEYS.ORG_ID}, ${DB_KEYS.ROLE}`)
    .eq(DB_KEYS.USER_ID, userId)
    .limit(1)
    .maybeSingle<Pick<OrganizationMember, "org_id" | "role">>();

  if (member?.org_id) {
    const { data: org } = await supabase
      .from(TABLES.ORGANIZATIONS)
      .select(DB_KEYS.NAME)
      .eq(DB_KEYS.ID, member.org_id)
      .limit(1)
      .maybeSingle();

    return {
      orgId: member.org_id,
      orgName: org?.name ?? null,
      isMember: member.role === memberRoles[1],
    };
  }
  return {
    orgId: null,
    orgName: null,
    isMember: false,
  };
}
