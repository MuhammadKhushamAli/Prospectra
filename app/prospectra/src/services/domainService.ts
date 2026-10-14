import axios from "axios";

import { getSupabaseClient } from "../config/supabaseClient";
import { backendApiPath } from "../constants/api";

export interface DnsRecordInfo {
  type: string;
  name: string;
  value: string;
}

export interface DnsInstructions {
  title: string;
  type: string;
  host: string;
  value: string;
}

export interface VerifyDomainResponse {
  domain: string;
  token: string;
  dns_instructions?: DnsInstructions;
  verified?: boolean;
  verification_status?: string;
  dns_records?: DnsRecordInfo;
}

export interface DomainStatusResponse {
  domain: string;
  verification_status: "pending" | "verified" | "failed" | string;
  dns_records?: DnsRecordInfo;
  dns_instructions?: DnsInstructions;
  verified_at?: string | null;
  esp_provider?: string | null;
}

export async function resolveUserOrgId(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionErr } =
    await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("No authenticated session found.");

  // 1. Check organization_members
  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (member?.org_id) return member.org_id;

  // 2. Check organizations where user is owner
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  if (org?.id) return org.id;

  throw new Error("Could not find your organization.");
}

export async function verifyDomainWithBackend(
  domain?: string,
): Promise<VerifyDomainResponse> {
  const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!baseURL) throw new Error("Missing EXPO_PUBLIC_BACKEND_URL.");

  const { data: sessionData, error } =
    await getSupabaseClient().auth.getSession();
  if (error) throw error;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("No authenticated session found.");

  const orgId = await resolveUserOrgId();

  const { data } = await axios.post<VerifyDomainResponse>(
    `${baseURL}${backendApiPath.verifyDomain}`,
    { token, org_id: orgId, ...(domain ? { domain } : {}) },
  );
  return data;
}

export async function getDomainStatusFromBackend(
): Promise<DomainStatusResponse> {
  const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!baseURL) throw new Error("Missing EXPO_PUBLIC_BACKEND_URL.");

  const { data: sessionData, error } =
    await getSupabaseClient().auth.getSession();
  if (error) throw error;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("No authenticated session found.");

  const orgId = await resolveUserOrgId();

  const { data } = await axios.post<DomainStatusResponse>(
    `${baseURL}${backendApiPath.domainStatus}`,
    { token, org_id: orgId },
  );
  return data;
}
