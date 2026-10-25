import type { ProfileSkillItem } from "../skills";

interface UserProfile {
  org_id: string;
  user_id: string;
  full_name: string;
  headline: string;
  email: string;
  github_url?: string | null;
  linkedin_url?: string | null;
  created_at: string;
}

interface UpdateProfileParams {
  headline: string;
  skills?: string[];
  fullName: string;
  githubUrl?: string;
  linkedinUrl?: string;
}

interface UserProfileData {
  userId: string;
  fullName: string;
  email: string;
  headline: string;
  skills?: string[];
  orgId?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
}

interface ProfileSetupHeaderProps {
  userName?: string;
}

interface ProfileSetupFormProps {
  initialFullName?: string;
  initialHeadline?: string;
  initialSkills?: string[];
  initialGithubUrl?: string;
  initialLinkedinUrl?: string;
  onSubmit?: (params: {
    fullName: string;
    headline: string;
    skills: string[];
    githubUrl?: string;
    linkedinUrl?: string;
  }) => void;
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
