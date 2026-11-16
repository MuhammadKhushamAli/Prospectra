/**
 * TypeScript definitions for organization administration, members, invites, and approvals.
 */

export type OrgRole = "founder" | "member";

export interface OrgMember {
  user_id: string;
  org_id: string;
  role: OrgRole;
  joined_at: string | null;
  full_name: string | null;
  headline: string | null;
  email: string | null;
  is_owner: boolean;
  invited_by?: string | null;
  allowed_actions: string[];
}

export interface OrgInvite {
  id: string;
  org_id: string;
  email: string;
  role: string;
  status: string;
  invite_by: string;
  expires_at: string | null;
  created_at: string | null;
}

export interface OrgApproval {
  id: string;
  org_id: string;
  request_type: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requested_by: string;
  target_user_id: string;
  target_email: string | null;
  target_name: string | null;
  from_role: string;
  to_role: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string | null;
}

export interface ActorMe {
  user_id: string;
  user_email: string;
  org_id: string;
  role: OrgRole;
  is_owner: boolean;
  is_founder: boolean;
}

export type ActorContext = ActorMe;

export interface AdminActionResult {
  status: "applied" | "pending_approval";
  message: string;
  approval_id?: string | null;
}
