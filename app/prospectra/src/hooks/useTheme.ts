import { useColorScheme } from "react-native";

import { theme } from "../constants/theme";

export type AppTheme = (typeof theme)["light"];

export function useTheme(): AppTheme {
  return theme[useColorScheme() === "dark" ? "dark" : "light"];
}
