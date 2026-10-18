import { profileValidationMessages } from "../constants/constants";

export function validateProfileHeadline(headline: string): string | null {
  const trimmed = headline.trim();
  if (!trimmed) {
    return profileValidationMessages.missingHeadline;
  }
  if (trimmed.length < 2) {
    return profileValidationMessages.headlineTooShort;
  }
  if (trimmed.length > 120) {
    return profileValidationMessages.headlineTooLong;
  }
  return null;
}
