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

export function validateCompanyFinderThreshold(
  thresholdStr: string | number,
): string | null {
  const str = String(thresholdStr).trim();
  if (!str) {
    return organizationValidationMessages.missingThreshold;
  }
  const num = Number(str);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 1 || num > 100000) {
    return organizationValidationMessages.invalidThreshold;
  }
  return null;
}
