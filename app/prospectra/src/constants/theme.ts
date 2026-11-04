const PRIMARY_COLOR = "#E08A52";
const PRIMARY_DARK_COLOR = "#B85C2A";
const DARK_BG = "#0B0F14";
const WARM_TEXT = "#EDEAE0";
const DARK_MUTED = "#9CA3AF";

export const theme = {
  light: {
    // Subtle warm glassmorphic light palette (no stark white, no green, no blue)
    background: "#EAE4D7",
    surface: "rgba(245, 242, 234, 0.74)",
    surfaceElevated: "rgba(235, 229, 216, 0.65)",
    border: "rgba(26, 26, 23, 0.13)",
    borderSubtle: "rgba(26, 26, 23, 0.07)",
    text: "#1A1A17",
    textPrimary: "#1A1A17",
    textSecondary: "#5C5A50",
    textMuted: "#5C5A50",
    textDisabled: "#9C9789",
    placeholder: "#8A8577",

    // Single primary accent token (Warm Copper-Amber)
    primary: PRIMARY_DARK_COLOR,
    primaryDark: PRIMARY_DARK_COLOR,
    primarySoft: "rgba(184, 92, 42, 0.14)",
    primaryBorder: "rgba(184, 92, 42, 0.36)",
    secondary: PRIMARY_COLOR,
    secondarySoft: "rgba(224, 138, 82, 0.15)",
    secondaryBorder: "rgba(224, 138, 82, 0.36)",
    accent: PRIMARY_DARK_COLOR,
    accentSoft: "rgba(184, 92, 42, 0.14)",
    accentBorder: "rgba(184, 92, 42, 0.36)",
    onPrimary: WARM_TEXT,

    // Semantic status colors (zero green, zero blue)
    success: PRIMARY_DARK_COLOR,
    successSoft: "rgba(184, 92, 42, 0.14)",
    successBorder: "rgba(184, 92, 42, 0.36)",
    warning: "#D97706",
    warningSoft: "rgba(217, 119, 6, 0.13)",
    warningBorder: "rgba(217, 119, 6, 0.32)",
    error: "#DC2626",
    errorSoft: "rgba(220, 38, 38, 0.11)",
    errorBorder: "rgba(220, 38, 38, 0.28)",
    danger: "#DC2626",
    dangerSoft: "rgba(220, 38, 38, 0.11)",
    dangerBorder: "rgba(220, 38, 38, 0.28)",
    info: PRIMARY_DARK_COLOR,
    infoSoft: "rgba(184, 92, 42, 0.14)",
    infoBorder: "rgba(184, 92, 42, 0.36)",

    // High-contrast translucent espresso-glass ID Card tokens
    cardSurface: "rgba(32, 27, 23, 0.86)",
    cardBorder: "rgba(224, 138, 82, 0.52)",
    cardAccent: PRIMARY_COLOR,
    cardAccentSoft: "rgba(224, 138, 82, 0.18)",
    cardText: WARM_TEXT,
    cardMuted: "#B8B2A2",
    cardDivider: "rgba(237, 234, 224, 0.14)",

    overlay: "rgba(11, 15, 20, 0.52)",
    tabBar: "rgba(245, 242, 234, 0.78)",
    tabActive: PRIMARY_DARK_COLOR,
    tabInactive: "#5C5A50",
    statusBar: "dark-content",
    shadow: DARK_BG,
    icon: require("../../assets/app_icons/prospectra-dark.png"),
  },
  dark: {
    // Subtle dark glassmorphic palette (no white, no green, no blue)
    background: DARK_BG,
    surface: "rgba(24, 31, 42, 0.72)",
    surfaceElevated: "rgba(36, 46, 62, 0.62)",
    border: "rgba(237, 234, 224, 0.13)",
    borderSubtle: "rgba(237, 234, 224, 0.07)",
    text: WARM_TEXT,
    textPrimary: WARM_TEXT,
    textSecondary: DARK_MUTED,
    textMuted: DARK_MUTED,
    textDisabled: "#6B7280",
    placeholder: "#6B7280",

    // Single primary accent token (Warm Copper-Amber)
    primary: PRIMARY_COLOR,
    primaryDark: PRIMARY_DARK_COLOR,
    primarySoft: "rgba(224, 138, 82, 0.15)",
    primaryBorder: "rgba(224, 138, 82, 0.38)",
    secondary: PRIMARY_COLOR,
    secondarySoft: "rgba(224, 138, 82, 0.15)",
    secondaryBorder: "rgba(224, 138, 82, 0.38)",
    accent: PRIMARY_COLOR,
    accentSoft: "rgba(224, 138, 82, 0.15)",
    accentBorder: "rgba(224, 138, 82, 0.38)",
    onPrimary: DARK_BG,

    // Semantic status colors (zero green, zero blue)
    success: PRIMARY_COLOR,
    successSoft: "rgba(224, 138, 82, 0.15)",
    successBorder: "rgba(224, 138, 82, 0.38)",
    warning: "#F59E0B",
    warningSoft: "rgba(245, 158, 11, 0.15)",
    warningBorder: "rgba(245, 158, 11, 0.32)",
    error: "#EF4444",
    errorSoft: "rgba(239, 68, 68, 0.15)",
    errorBorder: "rgba(239, 68, 68, 0.32)",
    danger: "#EF4444",
    dangerSoft: "rgba(239, 68, 68, 0.15)",
    dangerBorder: "rgba(239, 68, 68, 0.32)",
    info: PRIMARY_COLOR,
    infoSoft: "rgba(224, 138, 82, 0.15)",
    infoBorder: "rgba(224, 138, 82, 0.38)",

    // High-contrast translucent bronze-glass ID Card tokens
    cardSurface: "rgba(44, 35, 29, 0.82)",
    cardBorder: "rgba(224, 138, 82, 0.48)",
    cardAccent: PRIMARY_COLOR,
    cardAccentSoft: "rgba(224, 138, 82, 0.2)",
    cardText: WARM_TEXT,
    cardMuted: "#C4BEB0",
    cardDivider: "rgba(224, 138, 82, 0.22)",

    overlay: "rgba(6, 9, 13, 0.68)",
    tabBar: "rgba(21, 27, 35, 0.78)",
    tabActive: PRIMARY_COLOR,
    tabInactive: DARK_MUTED,
    statusBar: "light-content",
    shadow: "#000000",
    icon: require("../../assets/app_icons/prospectra-light.png"),
  },
};

export const tokens = {
  // Strict 8px spacing grid (with 4px half-step for tight inline elements)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    auth: 24,
    xl: 32,
  },
  // Consistent border radius tokens (including ~24px ID card radius)
  radius: {
    sm: 8,
    md: 10,
    lg: 14,
    xl: 16,
    card: 24,
    full: 999,
  },
  // Typographic scale
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 24,
    authTitle: 24,
    authSubtitle: 14,
  },
  // Soft glass elevation shadows
  shadow: {
    sm: {
      shadowColor: DARK_BG,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: DARK_BG,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 3,
    },
    lg: {
      shadowColor: DARK_BG,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.26,
      shadowRadius: 20,
      elevation: 5,
    },
  },
};
