/**
 * Helpers for Profile Setup screen and skills management.
 */

/**
 * Filter available skills by search keyword, excluding already selected skills.
 */
export function filterAvailableSkills(
  allSkills: string[],
  selectedSkills: string[],
  searchQuery: string,
): string[] {
  const selectedSet = new Set(selectedSkills.map((s) => s.toLowerCase()));
  const query = searchQuery.trim().toLowerCase();

  return allSkills.filter((skill) => {
    const lower = skill.toLowerCase();
    if (selectedSet.has(lower)) return false;
    if (!query) return true;
    return lower.includes(query);
  });
}

/**
 * Format a headline into clean trimmed title text.
 */
export function formatHeadline(headline: string | null | undefined): string {
  if (!headline) return "";
  return headline.trim().replace(/\s+/g, " ");
}
