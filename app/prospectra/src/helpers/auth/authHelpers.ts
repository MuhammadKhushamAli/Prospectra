/**
 * Helpers for Auth screen and mode switching.
 */

import type { AuthMode } from "../../types/auth";

/**
 * Toggle between "login" and "signup" auth modes.
 */
export function toggleAuthMode(current: AuthMode): AuthMode {
  return current === "login" ? "signup" : "login";
}
