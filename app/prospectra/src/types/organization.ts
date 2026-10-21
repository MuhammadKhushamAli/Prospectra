interface RegisterOrganizationParams {
  name: string;
  pending_threshold?: number;
}

interface Organization {
  id: string;
  name: string;
  owner_id: string;
  pending_threshold: number;
  created_at: string;
}

interface OrganizationRegistrationFormProps {
  onSubmit?: (params: { name: string; pending_threshold: number }) => void;
  isLoading?: boolean;
}

interface OrganizationRegistrationFooterLinkProps {
  onPress?: () => void;
}

interface OrganizationRegistrationHeaderProps {
  title?: string;
  subtitle?: string;
}

export type {
  RegisterOrganizationParams,
  Organization,
  OrganizationRegistrationFormProps,
  OrganizationRegistrationFooterLinkProps,
  OrganizationRegistrationHeaderProps,
};
