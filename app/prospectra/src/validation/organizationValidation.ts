import { organizationValidationMessages } from "../constants/constants";

export function validateOrganizationName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return organizationValidationMessages.missingName;
  }
  if (trimmed.length < 2) {
    return organizationValidationMessages.nameTooShort;
  }
  if (trimmed.length > 100) {
    return organizationValidationMessages.nameTooLong;
  }
  return null;
}
