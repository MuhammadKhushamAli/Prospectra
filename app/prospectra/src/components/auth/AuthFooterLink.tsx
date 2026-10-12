import { StyleSheet, Text } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { authMode, type AuthMode } from "../../constants/constants";

interface AuthFooterLinkProps {
  mode: AuthMode;
  onPress?: () => void;
}

export default function AuthFooterLink({ mode, onPress }: AuthFooterLinkProps) {
  const colors = useTheme();
  return (
    <Text
      onPress={onPress}
      style={[styles.text, { color: colors.textSecondary }]}
    >
      {mode === authMode.login
        ? "Don't have an account? "
        : "Already have an account? "}
      <Text style={{ color: colors.primary, fontFamily: "DMSansSemiBold" }}>
        {mode === authMode.login ? "Sign up" : "Log in"}
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: "center",
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    marginTop: tokens.spacing.lg,
  },
});
