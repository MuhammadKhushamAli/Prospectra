import { skillsValidationMessages } from "../constants/constants";

export function validateSkillName(
  name: string,
  existingSkills: string[],
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
  const isDuplicate = existingSkills.some(
    (s) => s.toLowerCase() === trimmed.toLowerCase(),
  );
  if (isDuplicate) {
    return skillsValidationMessages.duplicateSkill;
  }
  return null;
}
