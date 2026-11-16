/**
 * Helpers for Company modals and email extraction.
 */

import type { CompanyProspect } from "../../types/prospecting/company";

export interface SelectableCompanyEmail {
  email: string;
  name?: string;
  role?: string;
  isVerified?: boolean;
}

/**
 * Extracts unique candidate contacts and emails from a company's enriched profile or raw signals.
 */
export function extractSelectableEmails(
  company: CompanyProspect | null | undefined,
): SelectableCompanyEmail[] {
  if (!company) return [];

  const list: SelectableCompanyEmail[] = [];
  const seen = new Set<string>();

  // 1. From company.emails
  if (company.emails && Array.isArray(company.emails)) {
    for (const em of company.emails) {
      const clean = em.email?.trim()?.toLowerCase();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        const nameParts = [em.first_name, em.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        list.push({
          email: em.email.trim(),
          name: nameParts || undefined,
          role: em.email_of || "Contact",
          isVerified: em.is_verified,
        });
      }
    }
  }

  // 2. Fallback to raw_signals contacts / emails if list is still empty
  if (list.length === 0 && company.raw_signals) {
    const rawEmails =
      company.raw_signals.emails || company.raw_signals.contacts || [];
    if (Array.isArray(rawEmails)) {
      for (const item of rawEmails) {
        const rawStr = typeof item === "string" ? item : item?.email;
        const clean = rawStr?.trim()?.toLowerCase();
        if (clean && !seen.has(clean)) {
          seen.add(clean);
          list.push({
            email: clean,
            role:
              typeof item === "object"
                ? item?.role || item?.email_of
                : "Discovered Contact",
          });
        }
      }
    }
  }

  return list;
}
