import axios from "axios";

import { getSupabaseClient } from "../config/supabaseClient";
import { backendApiPath } from "../constants/api";
import { resolveUserOrgId } from "./domainService";
import type {
  WriteEmailRequest,
  WriteEmailResponse,
} from "../types/prospecting";

/**
 * Resolves the Supabase auth token, using fallback if not passed directly.
 */
export async function resolveAuthToken(userToken?: string): Promise<string> {
  if (userToken) return userToken;
  const supabase = getSupabaseClient();
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("No active authentication session found.");
  }
  return token;
}

/**
 * Resolves the active organization ID, using membership lookup if not passed directly.
 */
export async function resolveOrganizationId(targetOrgId?: string): Promise<string> {
  if (targetOrgId) return targetOrgId;
  const orgId = await resolveUserOrgId();
  if (!orgId) {
    throw new Error("Active organization could not be resolved.");
  }
  return orgId;
}

/**
 * Constructs the payload required by the backend /write-email endpoint.
 */
export function buildWriteEmailPayload(
  token: string,
  orgId: string,
  companyId: string,
  recipientEmails?: string[],
  orgDomain?: string | null,
  userId?: string | null,
  feedback?: string | null,
): WriteEmailRequest {
  const payload: WriteEmailRequest = {
    token,
    org_id: orgId,
    target_company_id: companyId,
  };
  if (recipientEmails && recipientEmails.length > 0) {
    payload.recipient_emails = recipientEmails;
  }
  if (orgDomain) {
    payload.org_domain = orgDomain;
  }
  if (userId) {
    payload.user_id = userId;
  }
  if (feedback && feedback.trim()) {
    payload.feedback = feedback.trim();
  }
  return payload;
}

/**
 * Executes the POST request to the backend write-email endpoint.
 */
export async function postWriteEmailRequest(
  baseURL: string,
  payload: WriteEmailRequest,
): Promise<WriteEmailResponse> {
  const { data } = await axios.post<WriteEmailResponse>(
    `${baseURL}${backendApiPath.writeEmail}`,
    payload,
    { timeout: 45000 },
  );
  return data;
}

/**
 * Sends a request to the backend to generate a targeted outreach email
 * for an approved company, passing user context, skills, and target signals.
 */
export async function requestEmailGeneration(
  companyId: string,
  options?: {
    userToken?: string;
    targetOrgId?: string;
    recipientEmails?: string[];
    orgDomain?: string | null;
    userId?: string | null;
    feedback?: string | null;
  },
): Promise<WriteEmailResponse> {
  const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const token = await resolveAuthToken(options?.userToken);
  const orgId = await resolveOrganizationId(options?.targetOrgId);

  const payload = buildWriteEmailPayload(
    token,
    orgId,
    companyId,
    options?.recipientEmails,
    options?.orgDomain,
    options?.userId,
    options?.feedback,
  );

  if (baseURL) {
    try {
      return await postWriteEmailRequest(baseURL, payload);
    } catch (err: any) {
      if (err?.response?.data) {
        return err.response.data as WriteEmailResponse;
      }
      console.warn("Backend /write-email request failed:", err?.message || err);
      return {
        status: "error",
        errors: [err?.message || "Failed to reach email generation service."],
      };
    }
  }

  // Graceful response when backend URL is not configured
  return {
    status: "partial",
    message: "Email generation request queued (backend URL not set).",
  };
}

