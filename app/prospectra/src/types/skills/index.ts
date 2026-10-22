import { defaultSkillSuggestions } from "../../constants/skills";

interface Skill {
  id: string;
  org_id: string;
  name: string;
  created_at?: string;
}

interface UserSkill {
  user_id: string;
  skill_id: string;
}

interface ProfileSkillItem {
  name: string;
}

interface ProfileSkillsSectionProps {
  skills: string[];
  onAddSkill: (skillName: string) => void;
  onRemoveSkill: (skillName: string) => void;
  editable?: boolean;
}

export type {
  Skill,
  UserSkill,
  ProfileSkillItem,
  ProfileSkillsSectionProps,
};

export { defaultSkillSuggestions };

