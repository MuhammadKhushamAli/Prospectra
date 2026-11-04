import { Pressable, StyleSheet, Text } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { authCopy, authMode } from "../../constants/constants";
import type { AuthFooterLinkProps } from "../../types/auth";

export type { AuthFooterLinkProps };

export default function AuthFooterLink({ mode, onPress }: AuthFooterLinkProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {mode === authMode.login
          ? authCopy.login.footerPrompt
          : authCopy.signup.footerPrompt}
        <Text style={[styles.action, { color: colors.primary }]}>
          {mode === authMode.login
            ? authCopy.login.footerAction
            : authCopy.signup.footerAction}
        </Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    marginTop: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  text: {
    textAlign: "center",
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  action: {
    fontFamily: "DMSansMedium",
  },
});
