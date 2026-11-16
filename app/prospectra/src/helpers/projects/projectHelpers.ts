/**
 * Helper functions for Project screen, forms, and portfolio items.
 */

import type { UserProject } from "../../types/projects";

/**
 * Filter projects by search term across title, description, and tech stack tags.
 */
export function filterProjects(projects: UserProject[], query: string): UserProject[] {
  if (!query || !query.trim()) return projects;
  const lower = query.trim().toLowerCase();
  return projects.filter(
    (p) =>
      p.title.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.techStack.some((t) => t.toLowerCase().includes(lower)),
  );
}

/**
 * Clean tech stack tags list (trims and removes empty strings and duplicates).
 */
export function normalizeTechStack(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const clean = tag.trim();
    if (clean && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      out.push(clean);
    }
  }
  return out;
}
