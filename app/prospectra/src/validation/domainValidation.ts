import { domainValidationMessages } from "../constants/constants";

const domainRegex =
  /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;

export function validateDomain(domain: string): string | null {
  const trimmed = domain.trim();
  if (!trimmed) {
    return domainValidationMessages.missingDomain;
  }
  // Remove protocol if user typed http:// or https://
  const sanitized = trimmed.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!domainRegex.test(sanitized)) {
    return domainValidationMessages.invalidDomain;
  }
  return null;
}
