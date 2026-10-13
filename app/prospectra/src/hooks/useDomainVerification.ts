import { useCallback, useState } from "react";

import {
  verifyDomainWithBackend,
  type VerifyDomainResponse,
} from "../services/domainService";

export function useDomainVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const verifyDomain = useCallback(
    async (orgId: string): Promise<VerifyDomainResponse> => {
      setIsLoading(true);
      try {
        return await verifyDomainWithBackend(orgId);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );
  return { verifyDomain, isLoading };
}
