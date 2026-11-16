/**
 * Status styling and display helpers for Prospecting companies and emails.
 */

import type { CompanyProspect } from "../../types/prospecting/company";
import type { EmailProspect } from "../../types/prospecting/email";

export function getCompanyStatusLabel(status: CompanyProspect["status"]): string {
  if (status === "rejected") return "Rejected";
  if (
    status === "pending_review" ||
    status === "discovered" ||
    status === "enriched"
  ) {
    return "Pending";
  }
  return "Approved";
}

export function getCompanyStatusColor(
  status: CompanyProspect["status"],
  colors: { error: string; warning: string; success: string },
): string {
  if (status === "rejected") return colors.error;
  if (
    status === "pending_review" ||
    status === "discovered" ||
    status === "enriched"
  ) {
    return colors.warning;
  }
  return colors.success;
}

export function getCompanyStatusSoftBg(
  status: CompanyProspect["status"],
  colors: { errorSoft: string; warningSoft: string; successSoft: string },
): string {
  if (status === "rejected") return colors.errorSoft;
  if (
    status === "pending_review" ||
    status === "discovered" ||
    status === "enriched"
  ) {
    return colors.warningSoft;
  }
  return colors.successSoft;
}

export function getCompanyStatusBorder(
  status: CompanyProspect["status"],
  colors: { errorBorder: string; warningBorder: string; successBorder: string },
): string {
  if (status === "rejected") return colors.errorBorder;
  if (
    status === "pending_review" ||
    status === "discovered" ||
    status === "enriched"
  ) {
    return colors.warningBorder;
  }
  return colors.successBorder;
}

export function getEmailStatusLabel(status: EmailProspect["status"]): string {
  if (status === "rejected") return "Rejected";
  if (status === "draft") return "Draft";
  if (status === "sending" || status === "approved") return "Sending";
  if (status === "sent") return "Sent";
  if (status === "replied") return "Replied";
  return "Pending";
}

export function getEmailStatusColor(
  status: EmailProspect["status"],
  colors: { error: string; warning: string; primary: string; success: string },
): string {
  if (status === "rejected") return colors.error;
  if (status === "draft") return colors.warning;
  if (status === "sending" || status === "approved") return colors.primary;
  return colors.success;
}

export function getEmailStatusSoftBg(
  status: EmailProspect["status"],
  colors: { errorSoft: string; warningSoft: string; primarySoft: string; successSoft: string },
): string {
  if (status === "rejected") return colors.errorSoft;
  if (status === "draft") return colors.warningSoft;
  if (status === "sending" || status === "approved") return colors.primarySoft;
  return colors.successSoft;
}

export function getEmailStatusBorder(
  status: EmailProspect["status"],
  colors: { errorBorder: string; warningBorder: string; primaryBorder: string; successBorder: string },
): string {
  if (status === "rejected") return colors.errorBorder;
  if (status === "draft") return colors.warningBorder;
  if (status === "sending" || status === "approved") return colors.primaryBorder;
  return colors.successBorder;
}
