export interface TargetIndustriesHeaderProps {
  userName?: string;
}

export interface TargetIndustriesFormProps {
  initialIndustries?: string[];
  onSubmit?: (industries: string[]) => void;
  isLoading?: boolean;
}

export interface TargetIndustriesFooterLinkProps {
  onBackToProfile?: () => void;
  onBackToDashboard?: () => void;
  onSignOut?: () => void;
}

export interface TargetIndustriesData {
  orgId: string;
  industries: string[];
}

export interface TargetIndustry {
  id: string;
  org_id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserTargetIndustry {
  user_id: string;
  target_industry_id: string;
}
