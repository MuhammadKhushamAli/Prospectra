import { memberRoles } from "../../constants/organization";

type tMemberRole = (typeof memberRoles)[number];

interface OrganizationMember {
  org_id: string;
  user_id: string;
  role: tMemberRole;
  joined_at?: string;
}

export type { tMemberRole, OrganizationMember };

// Re-export runtime constant for backward compatibility
export { memberRoles };
