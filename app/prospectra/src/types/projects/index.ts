export interface UserProject {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  liveDemoUrl?: string | null;
  repoUrl?: string | null;
  isImportedFromGithub?: boolean;
}

export interface ProjectFormValues {
  title: string;
  description: string;
  techStack: string[];
  liveDemoUrl?: string;
  repoUrl?: string;
}

export interface ProjectsHeaderProps {
  count: number;
  githubUsername?: string | null;
  onRefreshFromGithub?: () => void;
  isRefreshing?: boolean;
}

export interface ProjectCardProps {
  project: UserProject;
  onEdit: (project: UserProject) => void;
  onDelete: (projectId: string) => void;
  disabled?: boolean;
}

export interface ProjectModalProps {
  visible: boolean;
  project?: UserProject | null;
  onClose: () => void;
  onSave: (values: ProjectFormValues, projectId?: string) => void;
}

export interface ProjectsFooterActionsProps {
  onAddProject: () => void;
  onSubmit: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
  canSubmit?: boolean;
}
