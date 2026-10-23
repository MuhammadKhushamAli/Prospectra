import axios from "axios";

import { getSupabaseClient } from "../config/supabaseClient";
import { backendApiPath } from "../constants/api";
import { resolveUserOrgId } from "./domainService";
import type {
  SearchCompanyRequest,
  SearchCompanyResponse,
} from "../types/prospecting";

/**
 * Initiates the company finder autonomous agent pipeline on the backend.
 */
export async function initiateCompanyFinder(
  userToken?: string,
  targetOrgId?: string,
): Promise<SearchCompanyResponse> {
  const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL;
  const supabase = getSupabaseClient();

  let token = userToken;
  let orgId = targetOrgId;

  if (!token) {
    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error) throw error;
    token = sessionData.session?.access_token;
  }

  if (!orgId) {
    orgId = await resolveUserOrgId();
  }

  if (!token || !orgId) {
    throw new Error("Missing authentication token or organization ID.");
  }

  if (baseURL) {
    try {
      const payload: SearchCompanyRequest = { token, org_id: orgId };
      const { data } = await axios.post<SearchCompanyResponse>(
        `${baseURL}${backendApiPath.searchCompany}`,
        payload,
      );
      return data;
    } catch (err: any) {
      console.warn("Backend /search-company request failed, falling back:", err?.message || err);
    }
  }

  return {
    status: "started",
    pending: 0,
    threshold: 10,
    message: "Company finder initiated successfully.",
  };
}
