/**
 * Helpers for Organization Registration screen and slug generation.
 */

/**
 * Generate a clean URL-friendly slug from an organization name.
 */
export function generateOrgSlug(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
