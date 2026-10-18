import { useCallback, useState } from "react";

import {
  getDomainStatusFromBackend,
  verifyDomainWithBackend,
} from "../services/domainService";
import type {
  DomainStatusResponse,
  VerifyDomainResponse,
} from "../types/domain";

export function useDomainVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [verificationData, setVerificationData] =
    useState<VerifyDomainResponse | null>(null);
  const [statusData, setStatusData] = useState<DomainStatusResponse | null>(
    null,
  );

  const verifyDomain = useCallback(
    async (
      domain?: string,
    ): Promise<VerifyDomainResponse> => {
      setIsLoading(true);
      try {
        const result = await verifyDomainWithBackend(domain);
        setVerificationData(result);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const checkDomainStatus = useCallback(
    async (): Promise<DomainStatusResponse> => {
      setIsCheckingStatus(true);
      try {
        const result = await getDomainStatusFromBackend();
        setStatusData(result);
        return result;
      } finally {
        setIsCheckingStatus(false);
      }
    },
    [],
  );

  return {
    verifyDomain,
    checkDomainStatus,
    isLoading,
    isCheckingStatus,
    verificationData,
    statusData,
  };
}
