/**
 * Common error parsing and handling helpers.
 */

/**
 * Safely extract a human-readable error message from an unknown error value.
 */
export function getErrorMessage(error: unknown, fallbackMessage = "An unexpected error occurred."): string {
  if (!error) return fallbackMessage;
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.message === "string") return errObj.message;
    if (typeof errObj.error === "string") return errObj.error;
    if (typeof errObj.error_description === "string") return errObj.error_description;
  }
  return fallbackMessage;
}
