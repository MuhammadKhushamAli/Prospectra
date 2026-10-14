import { useCallback, useState } from "react";

import {
  registerOrganizationWithSupabase,
  type Organization,
  type RegisterOrganizationParams,
} from "../services/organizationService";

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
