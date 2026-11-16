/**
 * Helpers for Target Industries selection and filtering.
 */

/**
 * Toggle an industry item in an array of selected industry strings.
 */
export function toggleIndustrySelection(
  selected: string[],
  industry: string,
): string[] {
  if (selected.includes(industry)) {
    return selected.filter((i) => i !== industry);
  }
  return [...selected, industry];
}

/**
 * Filter industries by search keyword.
 */
export function filterIndustries(
  allIndustries: string[],
  query: string,
): string[] {
  if (!query || !query.trim()) return allIndustries;
  const lower = query.trim().toLowerCase();
  return allIndustries.filter((i) => i.toLowerCase().includes(lower));
}
