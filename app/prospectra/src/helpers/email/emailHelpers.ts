/**
 * Helpers for Email verification, SMTP configuration, and port detection.
 */

/**
 * Suggest standard SMTP host based on domain name.
 */
export function suggestSmtpHost(domain: string): string {
  if (!domain) return "";
  const clean = domain.trim().toLowerCase();
  return `smtp.${clean}`;
}

/**
 * Check if the port requires SSL/TLS directly (port 465) or STARTTLS (port 587).
 */
export function isSecureSmtpPort(port: number): boolean {
  return port === 465;
}
