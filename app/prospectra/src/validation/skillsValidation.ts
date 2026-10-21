import { skillsValidationMessages } from "../constants/constants";
import type { ProfileSkillItem } from "../types/skills";

export function validateSkillName(
  name: string,
  existingSkills: Array<string | ProfileSkillItem>,
  category?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return skillsValidationMessages.emptySkill;
  }
  if (trimmed.length < 2) {
    return skillsValidationMessages.skillTooShort;
  }
  if (trimmed.length > 50) {
    return skillsValidationMessages.skillTooLong;
  }

  const isDuplicate = existingSkills.some((s) => {
    const existingName = typeof s === "string" ? s : s.name;
    return existingName.toLowerCase() === trimmed.toLowerCase();
  });

  if (isDuplicate) {
    return skillsValidationMessages.duplicateSkill;
  }

  if (category !== undefined) {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) {
      return skillsValidationMessages.missingCategory;
    }
  }

  return null;
}
