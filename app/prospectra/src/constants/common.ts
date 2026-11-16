/**
 * Common constants shared across screens and components.
 */

export const APP_METRICS = {
  SCREEN_PADDING: 20,
  BORDER_RADIUS_SM: 8,
  BORDER_RADIUS_MD: 12,
  BORDER_RADIUS_LG: 16,
  BORDER_RADIUS_XL: 24,
  HEADER_ICON_SIZE: 20,
  CHIP_ICON_SIZE: 14,
} as const;

export const ANIMATION_PRESETS = {
  FAST_MS: 150,
  NORMAL_MS: 300,
  SLOW_MS: 500,
  NOTIFICATION_BANNER_MS: 4000,
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;
