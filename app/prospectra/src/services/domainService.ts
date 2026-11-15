import axios from "axios";

import { getSupabaseClient } from "../config/supabaseClient";
import { backendApiPath } from "../constants/api";
import { resolveUserOrgMembership } from "./onboarding/resolveUserOrgMembership";
import { isDomainVerified } from "./onboarding/isDomainVerified";
import {
  emailProviderPresets,
  type EmailProviderPresetOption,
} from "../constants/domain";
import type {
  DnsInstructions,
  DnsRecordInfo,
  DomainStatusResponse,
  EmailVerificationPayload,
  EmailVerificationResponse,
  VerifyDomainResponse,
} from "../types/domain";

export type {
  DnsInstructions,
  DnsRecordInfo,
  DomainStatusResponse,
  EmailVerificationPayload,
  EmailVerificationResponse,
  VerifyDomainResponse,
};

export { isDomainVerified };

export async function resolveUserOrgId(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionErr } =
    await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("No authenticated session found.");

  const { orgId } = await resolveUserOrgMembership(supabase, userId);
  if (orgId) return orgId;

  throw new Error("Could not find your organization.");
}

export async function verifyDomainWithBackend(
  domain?: string,
  smtpUsername?: string,
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
    {
      token,
      org_id: orgId,
      ...(domain ? { domain } : {}),
      ...(smtpUsername ? { smtp_username: smtpUsername } : {}),
    },
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

export async function verifyEmailWithBackend(
  payload: EmailVerificationPayload,
): Promise<EmailVerificationResponse> {
  const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!baseURL) throw new Error("Missing EXPO_PUBLIC_BACKEND_URL.");

  const { data: sessionData, error } =
    await getSupabaseClient().auth.getSession();
  if (error) throw error;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("No authenticated session found.");

  const orgId = await resolveUserOrgId();

  const { data } = await axios.post<EmailVerificationResponse>(
    `${baseURL}${backendApiPath.verifyEmail}`,
    {
      token,
      org_id: orgId,
      ...payload,
    },
  );
  return data;
}

export async function getEmailProvidersFromBackend(): Promise<
  EmailProviderPresetOption[]
> {
  const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!baseURL) return [...emailProviderPresets];

  try {
    const { data } = await axios.get<{
      providers?: Array<{
        id: string;
        label: string;
        smtp_server: string;
        smtp_port: number;
        default_dkim_selectors?: string[];
        is_custom?: boolean;
      }>;
    }>(`${baseURL}${backendApiPath.emailProviders}`);
    if (!data?.providers?.length) return [...emailProviderPresets];
    return data.providers.map((item) => ({
      id: item.id,
      label: item.label,
      smtpServer: item.smtp_server || "",
      smtpPort: item.smtp_port || 587,
      defaultDkimSelector: item.default_dkim_selectors?.[0] || "default",
      isCustom: Boolean(item.is_custom),
    }));
  } catch {
    return [...emailProviderPresets];
  }
}
