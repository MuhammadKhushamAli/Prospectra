import axios from "axios";

import { getSupabaseClient } from "../config/supabaseClient";
import { backendApiPath } from "../constants/api";

export interface VerifyDomainResponse {
  verified: boolean;
}

export async function verifyDomainWithBackend(
  orgId: string,
): Promise<VerifyDomainResponse> {
  const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!baseURL) throw new Error("Missing EXPO_PUBLIC_BACKEND_URL.");

  const { data: sessionData, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("No authenticated session found.");

  const { data } = await axios.post<VerifyDomainResponse>(
    `${baseURL}${backendApiPath.verifyDomain}`,
    { token, org_id: orgId },
  );
  return data;
}
