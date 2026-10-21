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
  category: string;
}

interface ProfileSkillsSectionProps {
  skills: string[];
  onAddSkill: (skillName: string) => void;
  onRemoveSkill: (skillName: string) => void;
  editable?: boolean;
}

const skillCategories = [
  "Sales & Outreach",
  "Lead Generation",
  "Marketing & Copywriting",
  "Engineering & Tech",
  "Operations & CRM",
  "Product & Design",
  "General",
] as const;

type SkillCategory = (typeof skillCategories)[number];

interface CategorizedSkillSuggestion {
  name: string;
  category: SkillCategory;
}

const defaultCategorizedSuggestions: CategorizedSkillSuggestion[] = [
  { name: "Cold Email", category: "Sales & Outreach" },
  { name: "B2B Sales", category: "Sales & Outreach" },
  { name: "LinkedIn Outreach", category: "Sales & Outreach" },
  { name: "Lead Generation", category: "Lead Generation" },
  { name: "Prospect Research", category: "Lead Generation" },
  { name: "Copywriting", category: "Marketing & Copywriting" },
  { name: "Email Deliverability", category: "Operations & CRM" },
  { name: "CRM Management", category: "Operations & CRM" },
  { name: "Full-Stack Development", category: "Engineering & Tech" },
  { name: "Python", category: "Engineering & Tech" },
  { name: "React Native", category: "Engineering & Tech" },
  { name: "UI/UX Design", category: "Product & Design" },
];

const defaultSkillSuggestions = defaultCategorizedSuggestions.map((s) => s.name);

export type {
  Skill,
  UserSkill,
  ProfileSkillItem,
  ProfileSkillsSectionProps,
  SkillCategory,
  CategorizedSkillSuggestion,
};

export {
  skillCategories,
  defaultCategorizedSuggestions,
  defaultSkillSuggestions,
};
