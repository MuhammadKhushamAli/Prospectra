/**
 * HTTP client service for Organization Admin endpoints.
 */

import axios from "axios";
import { getSupabaseClient } from "../config/supabaseClient";
import { TABLES } from "../constants/tables";
import type {
  ActorContext,
  ActorMe,
  AdminActionResult,
  OrgApproval,
  OrgInvite,
  OrgMember,
  OrgRole,
} from "../types/admin";

export async function resolveCurrentOrgId(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) {
    throw new Error("No active session found.");
  }
  const { data: member } = await supabase
    .from(TABLES.ORGANIZATION_MEMBERS)
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!member?.org_id) {
    throw new Error("User does not belong to an organization.");
  }
  return member.org_id;
}

async function getAuthHeaders(): Promise<{ Authorization: string }> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error("No active session found. Please log in again.");
  }
  return { Authorization: `Bearer ${token}` };
}

function getBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!url) {
    throw new Error("Backend URL (EXPO_PUBLIC_BACKEND_URL) is not configured.");
  }
  return url.replace(/\/+$/, "");
}

export async function getActorMe(orgId: string): Promise<ActorMe> {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${getBaseUrl()}/api/v1/org/${orgId}/me`, { headers });
  return res.data;
}

export async function fetchMembers(orgId: string): Promise<OrgMember[]> {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${getBaseUrl()}/api/v1/org/${orgId}/members`, { headers });
  return res.data || [];
}

export async function fetchInvites(orgId: string): Promise<OrgInvite[]> {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${getBaseUrl()}/api/v1/org/${orgId}/invites`, { headers });
  return res.data || [];
}

export async function fetchApprovals(orgId: string): Promise<OrgApproval[]> {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${getBaseUrl()}/api/v1/org/${orgId}/approvals`, { headers });
  return res.data || [];
}

export async function fetchMyRequests(orgId: string): Promise<OrgApproval[]> {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${getBaseUrl()}/api/v1/org/${orgId}/my-requests`, { headers });
  return res.data || [];
}

export async function sendInvite(
  orgId: string,
  email: string,
): Promise<AdminActionResult> {
  const headers = await getAuthHeaders();
  const res = await axios.post(
    `${getBaseUrl()}/api/v1/org/${orgId}/invites`,
    { email },
    { headers },
  );
  return res.data;
}

export async function revokeInvite(
  orgId: string,
  inviteId: string,
): Promise<AdminActionResult> {
  const headers = await getAuthHeaders();
  const res = await axios.delete(
    `${getBaseUrl()}/api/v1/org/${orgId}/invites/${inviteId}`,
    { headers },
  );
  return res.data;
}

export async function changeMemberRole(
  orgId: string,
  userId: string,
  role: OrgRole,
): Promise<AdminActionResult> {
  const headers = await getAuthHeaders();
  const res = await axios.patch(
    `${getBaseUrl()}/api/v1/org/${orgId}/members/${userId}/role`,
    { role },
    { headers },
  );
  return res.data;
}

export async function removeMember(
  orgId: string,
  userId: string,
): Promise<AdminActionResult> {
  const headers = await getAuthHeaders();
  const res = await axios.delete(
    `${getBaseUrl()}/api/v1/org/${orgId}/members/${userId}`,
    { headers },
  );
  return res.data;
}

export async function approveRequest(
  orgId: string,
  approvalId: string,
): Promise<AdminActionResult> {
  const headers = await getAuthHeaders();
  const res = await axios.post(
    `${getBaseUrl()}/api/v1/org/${orgId}/approvals/${approvalId}/approve`,
    {},
    { headers },
  );
  return res.data;
}

export async function rejectRequest(
  orgId: string,
  approvalId: string,
  note?: string,
): Promise<AdminActionResult> {
  const headers = await getAuthHeaders();
  const res = await axios.post(
    `${getBaseUrl()}/api/v1/org/${orgId}/approvals/${approvalId}/reject`,
    { note },
    { headers },
  );
  return res.data;
}

export async function claimInviteOnSignup(): Promise<{
  claimed: boolean;
  org_id?: string;
  role?: string;
  message?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const res = await axios.post(`${getBaseUrl()}/api/v1/invites/claim`, {}, { headers });
    return res.data;
  } catch {
    return { claimed: false };
  }
}

export async function fetchMemberCompanies(
  orgId: string,
  userId: string,
): Promise<any[]> {
  const headers = await getAuthHeaders();
  const res = await axios.get(
    `${getBaseUrl()}/api/v1/org/${orgId}/members/${userId}/companies`,
    { headers },
  );
  return res.data || [];
}

export async function fetchMemberEmails(
  orgId: string,
  userId: string,
): Promise<any[]> {
  const headers = await getAuthHeaders();
  const res = await axios.get(
    `${getBaseUrl()}/api/v1/org/${orgId}/members/${userId}/emails`,
    { headers },
  );
  return res.data || [];
}

export const adminService = {
  fetchActorContext: async (explicitOrgId?: string): Promise<ActorContext> => {
    const orgId = explicitOrgId || (await resolveCurrentOrgId());
    return getActorMe(orgId);
  },
  fetchMembers: async (explicitOrgId?: string): Promise<OrgMember[]> => {
    const orgId = explicitOrgId || (await resolveCurrentOrgId());
    return fetchMembers(orgId);
  },
  fetchPendingInvites: async (explicitOrgId?: string): Promise<OrgInvite[]> => {
    const orgId = explicitOrgId || (await resolveCurrentOrgId());
    return fetchInvites(orgId);
  },
  fetchApprovals: async (explicitOrgId?: string): Promise<OrgApproval[]> => {
    const orgId = explicitOrgId || (await resolveCurrentOrgId());
    return fetchApprovals(orgId);
  },
  fetchMyRequests: async (explicitOrgId?: string): Promise<OrgApproval[]> => {
    const orgId = explicitOrgId || (await resolveCurrentOrgId());
    return fetchMyRequests(orgId);
  },
  inviteMember: async (email: string, explicitOrgId?: string): Promise<AdminActionResult> => {
    const orgId = explicitOrgId || (await resolveCurrentOrgId());
    return sendInvite(orgId, email);
  },
  revokeInvite: async (inviteId: string, explicitOrgId?: string): Promise<AdminActionResult> => {
    const orgId = explicitOrgId || (await resolveCurrentOrgId());
    return revokeInvite(orgId, inviteId);
  },
  changeMemberRole: async (
    userId: string,
    newRole: OrgRole,
    explicitOrgId?: string,
  ): Promise<AdminActionResult> => {
    const orgId = explicitOrgId || (await resolveCurrentOrgId());
    return changeMemberRole(orgId, userId, newRole);
  },
  removeMember: async (userId: string, explicitOrgId?: string): Promise<AdminActionResult> => {
    const orgId = explicitOrgId || (await resolveCurrentOrgId());
    return removeMember(orgId, userId);
  },
  decideApproval: async (
    approvalId: string,
    decision: "approve" | "reject",
    note?: string,
    explicitOrgId?: string,
  ): Promise<AdminActionResult> => {
    const orgId = explicitOrgId || (await resolveCurrentOrgId());
    if (decision === "approve") {
      return approveRequest(orgId, approvalId);
    }
    return rejectRequest(orgId, approvalId, note);
  },
  claimInviteOnSignup,
  fetchMemberCompanies: async (userId: string, explicitOrgId?: string): Promise<any[]> => {
    const orgId = explicitOrgId || (await resolveCurrentOrgId());
    return fetchMemberCompanies(orgId, userId);
  },
  fetchMemberEmails: async (userId: string, explicitOrgId?: string): Promise<any[]> => {
    const orgId = explicitOrgId || (await resolveCurrentOrgId());
    return fetchMemberEmails(orgId, userId);
  },
};
