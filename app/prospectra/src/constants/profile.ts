/**
 * Constants for the Profile Setup screen and skills configuration.
 */

export const PROFILE_COPY = {
  TITLE: "Personal Profile",
  SUBTITLE: "Set up your role headline, expertise skills, and social links.",
  HEADLINE_LABEL: "Professional Headline",
  HEADLINE_PLACEHOLDER: "e.g. Lead Full-Stack Engineer & AI Architect",
  SKILLS_LABEL: "Core Skills & Tech Stack",
  SKILLS_PLACEHOLDER: "Search or add custom skill...",
  GITHUB_LABEL: "GitHub Profile",
  GITHUB_PLACEHOLDER: "https://github.com/username",
  LINKEDIN_LABEL: "LinkedIn Profile",
  LINKEDIN_PLACEHOLDER: "https://linkedin.com/in/username",
  SUBMIT_BUTTON: "Save Profile",
  SUBMIT_SUCCESS: "Profile updated successfully.",
} as const;

export const PROFILE_LIMITS = {
  HEADLINE_MAX_LENGTH: 100,
  MAX_SELECTED_SKILLS: 20,
  MIN_SELECTED_SKILLS: 1,
} as const;
