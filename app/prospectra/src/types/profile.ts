interface UserProfile {
  org_id: string;
  user_id: string;
  full_name?: string | null;
  headline?: string | null;
  email?: string | null;
  created_at?: string;
}

interface UpdateProfileParams {
  headline: string;
}

interface UserProfileData {
  userId: string;
  fullName: string;
  email: string;
  headline: string;
  orgId?: string | null;
}

interface ProfileSetupHeaderProps {
  userName?: string;
}

interface ProfileSetupFormProps {
  initialHeadline?: string;
  onSubmit?: (headline: string) => void;
  isLoading?: boolean;
}

interface ProfileSetupFooterLinkProps {
  onPress?: () => void;
}

export type {
  UserProfile,
  UpdateProfileParams,
  UserProfileData,
  ProfileSetupHeaderProps,
  ProfileSetupFormProps,
  ProfileSetupFooterLinkProps,
};
