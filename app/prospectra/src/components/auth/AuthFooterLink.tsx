import { StyleSheet, Text } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { authCopy, authMode } from "../../constants/constants";
import type { AuthFooterLinkProps, AuthMode } from "../../types/auth";

export type { AuthFooterLinkProps };

export default function AuthFooterLink({ mode, onPress }: AuthFooterLinkProps) {
  const colors = useTheme();
  return (
    <Text
      onPress={onPress}
      style={[styles.text, { color: colors.textSecondary }]}
    >
      {mode === authMode.login ? authCopy.login.footerPrompt : authCopy.signup.footerPrompt}
      <Text style={{ color: colors.primary, fontFamily: "DMSansSemiBold" }}>
        {mode === authMode.login ? authCopy.login.footerAction : authCopy.signup.footerAction}
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
