import { useCallback, useState } from "react";

import { registerOrganizationWithSupabase } from "../services/organizationService";
import type {
  Organization,
  RegisterOrganizationParams,
} from "../types/organization";

export function useOrganization() {
  const [isLoading, setIsLoading] = useState(false);

  const registerOrganization = useCallback(
    async (params: RegisterOrganizationParams): Promise<Organization> => {
      setIsLoading(true);
      try {
        return await registerOrganizationWithSupabase(params);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { registerOrganization, isLoading };
}
