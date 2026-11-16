/**
 * Helpers for Admin / Team Management screen.
 */

import type { OrgMember, OrgRole } from "../../types/admin";

/**
 * Filter organization members by search keyword across name and email.
 */
export function filterMembers(
  members: OrgMember[],
  query: string,
): OrgMember[] {
  if (!query || !query.trim()) return members;
  const lower = query.trim().toLowerCase();
  return members.filter(
    (m) =>
      (m.full_name || "").toLowerCase().includes(lower) ||
      (m.email || "").toLowerCase().includes(lower),
  );
}

/**
 * Format role label for display with capital first letter.
 */
export function formatRoleLabel(role: OrgRole): string {
  if (role === "founder") return "Founder";
  return "Member";
}
