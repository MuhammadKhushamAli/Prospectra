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
