interface Skill {
  id: string;
  org_id: string;
  name: string;
  description: string;
  category?: string | null;
  created_at?: string;
}

interface UserSkill {
  user_id: string;
  skill_id: string;
}

interface ProfileSkillsSectionProps {
  skills: string[];
  onAddSkill: (skillName: string) => void;
  onRemoveSkill: (skillName: string) => void;
  editable?: boolean;
}

const defaultSkillSuggestions = [
  "Lead Generation",
  "Cold Email",
  "B2B Sales",
  "LinkedIn Outreach",
  "Sales Pipeline",
  "Copywriting",
  "CRM Management",
  "Email Deliverability",
] as const;

export type {
  Skill,
  UserSkill,
  ProfileSkillsSectionProps,
};

export {
  defaultSkillSuggestions,
};
