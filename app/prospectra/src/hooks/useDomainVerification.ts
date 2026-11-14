import { useCallback, useState } from "react";

import {
  getDomainStatusFromBackend,
  verifyDomainWithBackend,
  verifyEmailWithBackend,
} from "../services/domainService";
import type {
  DomainStatusResponse,
  EmailVerificationPayload,
  EmailVerificationResponse,
  VerifyDomainResponse,
} from "../types/domain";

export function useDomainVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationData, setVerificationData] =
    useState<VerifyDomainResponse | null>(null);
  const [statusData, setStatusData] = useState<DomainStatusResponse | null>(
    null,
  );
  const [emailVerificationData, setEmailVerificationData] =
    useState<EmailVerificationResponse | null>(null);

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

  const verifyEmail = useCallback(
    async (
      payload: EmailVerificationPayload,
    ): Promise<EmailVerificationResponse> => {
      setIsVerifyingEmail(true);
      try {
        const result = await verifyEmailWithBackend(payload);
        setEmailVerificationData(result);
        return result;
      } finally {
        setIsVerifyingEmail(false);
      }
    },
    [],
  );

  return {
    verifyDomain,
    checkDomainStatus,
    verifyEmail,
    isLoading,
    isCheckingStatus,
    isVerifyingEmail,
    verificationData,
    statusData,
    emailVerificationData,
  };
}
