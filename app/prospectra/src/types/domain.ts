const domainVerificationStatuses = ["pending", "verified", "failed"] as const;
type tDomainVerificationStatus = typeof domainVerificationStatuses[number];

const espProviders = ["google", "resend"] as const;
type tEspProvider = typeof espProviders[number];

interface DnsRecordInfo {
  type: string;
  name: string;
  value: string;
}

interface DnsInstructions {
  title: string;
  type: string;
  host: string;
  value: string;
}

interface DomainVerification {
  org_id: string;
  domain: string;
  dns_records: Record<string, unknown> | DnsRecordInfo;
  verification_status: tDomainVerificationStatus;
  verified_at?: string | null;
  created_at: string;
}

interface VerifyDomainResponse {
  domain: string;
  token: string;
  dns_instructions?: DnsInstructions;
  verified?: boolean;
  verification_status?: tDomainVerificationStatus | string;
  dns_records?: DnsRecordInfo;
}

interface DomainStatusResponse {
  domain: string;
  verification_status: tDomainVerificationStatus | string;
  dns_records?: DnsRecordInfo;
  dns_instructions?: DnsInstructions;
  verified_at?: string | null;
  esp_provider?: tEspProvider | string | null;
}

interface DomainVerificationFormProps {
  onSubmit?: (domain: string) => void;
  isLoading?: boolean;
}

interface DomainVerificationFooterLinkProps {
  onPress?: () => void;
}

export type {
  tDomainVerificationStatus,
  tEspProvider,
  DnsRecordInfo,
  DnsInstructions,
  DomainVerification,
  VerifyDomainResponse,
  DomainStatusResponse,
  DomainVerificationFormProps,
  DomainVerificationFooterLinkProps,
};

export {
  domainVerificationStatuses,
  espProviders,
};
