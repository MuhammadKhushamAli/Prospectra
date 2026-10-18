interface RegisterOrganizationParams {
  name: string;
}

interface Organization {
  id: string;
  name: string;
  owner_id: string;
  pending_threshold: number;
  created_at: string;
}

interface OrganizationRegistrationFormProps {
  onSubmit?: (name: string) => void;
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
