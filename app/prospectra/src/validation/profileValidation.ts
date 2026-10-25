import { profileValidationMessages } from "../constants/constants";

export function validateProfileFullName(fullName: string): string | null {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return profileValidationMessages.missingFullName;
  }
  if (trimmed.length < 2) {
    return profileValidationMessages.fullNameTooShort;
  }
  return null;
}

export function validateProfileHeadline(headline: string): string | null {
  const trimmed = headline.trim();
  if (!trimmed) {
    return profileValidationMessages.missingHeadline;
  }
  if (trimmed.length < 2) {
    return profileValidationMessages.headlineTooShort;
  }
  if (trimmed.length > 120) {
    return profileValidationMessages.headlineTooLong;
  }
  return null;
}

export function validateGithubUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  let fullUrl = trimmed;
  if (!/^https?:\/\//i.test(fullUrl)) {
    fullUrl = `https://${fullUrl.replace(/^@/, "github.com/")}`;
  }

  const githubRegex = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}\/?$/i;

  if (!githubRegex.test(fullUrl)) {
    return profileValidationMessages.invalidGithubUrl;
  }
  return null;
}

export function validateLinkedinUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }
  const trimmed = url.trim();
  const emptyPrefixes = [
    "https://linkedin.com/in/",
    "https://www.linkedin.com/in/",
    "http://linkedin.com/in/",
    "http://www.linkedin.com/in/",
    "https://linkedin.com/in",
    "https://www.linkedin.com/in",
    "linkedin.com/in/",
    "www.linkedin.com/in/",
    "linkedin.com/in",
    "www.linkedin.com/in",
  ];

  if (!trimmed || emptyPrefixes.includes(trimmed.toLowerCase())) {
    return null;
  }

  let fullUrl = trimmed;
  if (!/^https?:\/\//i.test(fullUrl)) {
    fullUrl = `https://${fullUrl}`;
  }

  const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-\u00C0-\u017F%]{3,100}\/?$/i;

  if (!linkedinRegex.test(fullUrl)) {
    return profileValidationMessages.invalidLinkedinUrl;
  }
  return null;
}
