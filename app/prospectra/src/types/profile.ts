import type { ProfileSkillItem } from "./skills";

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
  skills?: string[];
}

interface UserProfileData {
  userId: string;
  fullName: string;
  email: string;
  headline: string;
  skills?: string[];
  orgId?: string | null;
}

interface ProfileSetupHeaderProps {
  userName?: string;
}

interface ProfileSetupFormProps {
  initialHeadline?: string;
  initialSkills?: string[];
  onSubmit?: (params: { headline: string; skills: string[] }) => void;
  isLoading?: boolean;
}

interface ProfileSetupFooterLinkProps {
  onBackToDashboard?: () => void;
  onSignOut?: () => void;
  onPress?: () => void;
}

export type {
  UserProfile,
  UpdateProfileParams,
  UserProfileData,
  ProfileSetupHeaderProps,
  ProfileSetupFormProps,
  ProfileSetupFooterLinkProps,
  ProfileSkillItem,
};
