import type { ComponentType } from "react";
import {
  domainVerificationStatuses,
  espProviders,
  type EmailProviderPresetOption,
} from "../../constants/domain";

type tDomainVerificationStatus = (typeof domainVerificationStatuses)[number];
type tEspProvider = (typeof espProviders)[number];

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
  dns_records?: DnsRecordInfo & Record<string, any>;
  dns_instructions?: DnsInstructions;
  verified_at?: string | null;
  esp_provider?: tEspProvider | string | null;
  user_email?: string | null;
  sender_email?: string | null;
  email_provider?: string | null;
  smtp_used?: string | null;
  smtp_server?: string | null;
  smtp_port?: number | null;
  dkim_selector?: string | null;
  email_verification_status?: tDomainVerificationStatus | string;
  email_verified_at?: string | null;
  email_verification_details?: Record<string, any>;
}

interface EmailVerificationPayload {
  email?: string;
  email_provider: string;
  custom_email_provider?: string;
  smtp_server: string;
  smtp_port: number;
  smtp_username?: string;
  smtp_password?: string;
  dkim_selector?: string;
}

interface EmailVerificationResponse {
  verified: boolean;
  verification_status: string;
  sender_email: string;
  domain: string;
  email_provider: string;
  email_provider_label?: string;
  is_custom_provider?: boolean;
  smtp_used: string;
  smtp_server: string;
  smtp_port: number;
  dkim_selector?: string | null;
  authentication_results_header: string;
  mx_valid: boolean;
  mx_records: string[];
  spf_valid: boolean;
  spf_record?: string | null;
  spf_result: string;
  dmarc_valid: boolean;
  dmarc_record?: string | null;
  dmarc_policy?: string | null;
  dkim_valid: boolean;
  dkim_record?: string | null;
  smtp_reachable: boolean;
  smtp_authenticated?: boolean | null;
  smtp_banner?: string | null;
  warnings: string[];
  errors: string[];
}

interface DomainVerificationFormProps {
  onSubmit?: (domain: string) => void;
  isLoading?: boolean;
  userEmail?: string | null;
  initialDomain?: string;
}

interface DomainVerificationFooterLinkProps {
  onPress?: () => void;
}

interface VerificationHeaderProps {
  badgeLabel?: string;
  title?: string;
  subtitle?: string;
  icon?: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

interface EmailVerificationFormProps {
  activeDomain: string;
  userEmail: string | null;
  providers: EmailProviderPresetOption[];
  emailProvider: string;
  customEmailProvider: string;
  smtpServer: string;
  smtpPort: string;
  dkimSelector: string;
  smtpPassword: string;
  emailStatus: string | null;
  emailDetails: Partial<EmailVerificationResponse> | Record<string, any> | null;
  isVerifyingEmail: boolean;
  onSelectProvider: (providerId: string) => void;
  onChangeCustomEmailProvider: (text: string) => void;
  onChangeSmtpServer: (text: string) => void;
  onChangeSmtpPort: (text: string) => void;
  onChangeDkimSelector: (text: string) => void;
  onChangeSmtpPassword: (text: string) => void;
  onVerifyEmail: () => void;
  onContinueToDashboard: () => void;
}

export type {
  tDomainVerificationStatus,
  tEspProvider,
  DnsRecordInfo,
  DnsInstructions,
  DomainVerification,
  VerifyDomainResponse,
  DomainStatusResponse,
  EmailVerificationPayload,
  EmailVerificationResponse,
  DomainVerificationFormProps,
  DomainVerificationFooterLinkProps,
  VerificationHeaderProps,
  EmailVerificationFormProps,
};

// Re-export runtime constants for backward compatibility
export { domainVerificationStatuses, espProviders };
