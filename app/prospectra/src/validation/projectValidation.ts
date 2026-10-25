import type { ProjectFormValues } from "../types/projects";

export const projectValidationMessages = {
  missingTitle: "Project title is required.",
  titleTooShort: "Project title must be at least 2 characters.",
  titleTooLong: "Project title must be less than 100 characters.",
  missingDescription: "Project description is required.",
  descriptionTooShort: "Project description must be at least 5 characters.",
  descriptionTooLong: "Project description must be less than 1000 characters.",
  invalidLiveUrl: "Enter a valid URL (e.g. https://example.com).",
  invalidRepoUrl: "Enter a valid GitHub URL (e.g. https://github.com/user/repo).",
} as const;

export function validateProjectTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) {
    return projectValidationMessages.missingTitle;
  }
  if (trimmed.length < 2) {
    return projectValidationMessages.titleTooShort;
  }
  if (trimmed.length > 100) {
    return projectValidationMessages.titleTooLong;
  }
  return null;
}

export function validateProjectDescription(description: string): string | null {
  const trimmed = description.trim();
  if (!trimmed) {
    return projectValidationMessages.missingDescription;
  }
  if (trimmed.length < 5) {
    return projectValidationMessages.descriptionTooShort;
  }
  if (trimmed.length > 1000) {
    return projectValidationMessages.descriptionTooLong;
  }
  return null;
}

export function validateProjectLiveUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  let fullUrl = trimmed;
  if (!/^https?:\/\//i.test(fullUrl)) {
    fullUrl = `https://${fullUrl}`;
  }

  try {
    const parsed = new URL(fullUrl);
    if (!parsed.protocol.startsWith("http")) {
      return projectValidationMessages.invalidLiveUrl;
    }
    return null;
  } catch {
    return projectValidationMessages.invalidLiveUrl;
  }
}

export function validateProjectForm(
  values: ProjectFormValues,
): { title?: string; description?: string; liveDemoUrl?: string } | null {
  const titleErr = validateProjectTitle(values.title);
  const descErr = validateProjectDescription(values.description);
  const liveErr = validateProjectLiveUrl(values.liveDemoUrl);

  if (titleErr || descErr || liveErr) {
    return {
      ...(titleErr ? { title: titleErr } : {}),
      ...(descErr ? { description: descErr } : {}),
      ...(liveErr ? { liveDemoUrl: liveErr } : {}),
    };
  }

  return null;
}
