import { domainValidationMessages } from "../constants/constants";

export const FREE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "aim.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "mail.com",
  "gmx.com",
  "gmx.net",
  "yandex.com",
  "yandex.ru",
  "tutanota.com",
  "tuta.com",
  "tuta.io",
  "fastmail.com",
  "hushmail.com",
  "inbox.com",
  "mail.ru",
]);

export function sanitizeDomainInput(raw: string): string {
  let cleaned = raw.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (cleaned.includes("@")) {
    cleaned = cleaned.split("@").pop() || cleaned;
  }
  return cleaned.replace(/^www\./, "");
}

export function isFreeEmailProvider(domain: string): boolean {
  if (!domain) return false;
  const sanitized = sanitizeDomainInput(domain);
  if (!sanitized) return false;

  if (FREE_EMAIL_DOMAINS.has(sanitized)) {
    return true;
  }
  for (const freeDomain of FREE_EMAIL_DOMAINS) {
    if (sanitized.endsWith(`.${freeDomain}`)) {
      return true;
    }
  }
  return false;
}

const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;

export function validateDomain(domain: string): string | null {
  const trimmed = domain.trim();
  if (!trimmed) {
    return domainValidationMessages.missingDomain;
  }
  if (isFreeEmailProvider(trimmed)) {
    return domainValidationMessages.freeEmailProvider;
  }
  const sanitized = sanitizeDomainInput(trimmed);
  if (!domainRegex.test(sanitized)) {
    return domainValidationMessages.invalidDomain;
  }
  return null;
}
