/**
 * Constants for the Projects management screen, GitHub integration, and project modals.
 */

export const PROJECTS_COPY = {
  TITLE: "Showcase Projects",
  SUBTITLE: "Add key projects or sync from GitHub to tailor outreach proposals.",
  EMPTY_TITLE: "No projects added yet",
  EMPTY_SUBTITLE: "Showcase your best engineering work. These projects power tailored email hypotheses.",
  ADD_PROJECT_BUTTON: "Add Project",
  SYNC_GITHUB_BUTTON: "Sync GitHub",
  DELETE_CONFIRM_TITLE: "Delete Project",
  DELETE_CONFIRM_MESSAGE: "Are you sure you want to delete this project? This cannot be undone.",
  MODAL_CREATE_TITLE: "Add New Project",
  MODAL_EDIT_TITLE: "Edit Project",
  SAVE_BUTTON: "Save Project",
  CANCEL_BUTTON: "Cancel",
} as const;

export const PROJECTS_LIMITS = {
  TITLE_MAX_LENGTH: 80,
  DESCRIPTION_MAX_LENGTH: 500,
  MAX_TECH_TAGS: 12,
} as const;
