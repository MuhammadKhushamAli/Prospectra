/**
 * Helpers for Domain verification and DNS instruction formatting.
 */

import { cleanDomainName } from "../common/formatters";

/**
 * Validate domain format (e.g., domain.com, sub.domain.org).
 */
export function isValidDomainFormat(domain: string): boolean {
  if (!domain) return false;
  const clean = cleanDomainName(domain);
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return domainRegex.test(clean);
}

/**
 * Clean and normalize domain name string for registration.
 */
export function normalizeDomain(domain: string): string {
  return cleanDomainName(domain);
}
