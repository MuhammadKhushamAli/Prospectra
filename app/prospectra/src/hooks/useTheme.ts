import { useColorScheme } from "react-native";

import { theme } from "../constants/theme";

import type { AppTheme } from "../types/theme";

export type { AppTheme };

export function useTheme(): AppTheme {
  return theme[useColorScheme() === "dark" ? "dark" : "light"];
}
