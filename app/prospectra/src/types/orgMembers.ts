const memberRoles = ["founder", "member"] as const;
type tMemberRole = typeof memberRoles[number];

interface OrganizationMember {
  org_id: string;
  user_id: string;
  role: tMemberRole;
  joined_at?: string;
}

export type {
    tMemberRole,
    OrganizationMember,
}

export {
    memberRoles
}