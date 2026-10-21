import { Pressable, StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { profileSetupCopy } from "../../constants/constants";
import type { ProfileSetupFooterLinkProps } from "../../types/profile";

export type { ProfileSetupFooterLinkProps };

export default function ProfileSetupFooterLink({
  onBackToDashboard,
  onSignOut,
  onPress,
}: ProfileSetupFooterLinkProps) {
  const colors = useTheme();
  return (
    <View style={styles.container}>
      {onBackToDashboard ? (
        <Pressable onPress={onBackToDashboard} style={styles.link}>
          <Text style={[styles.dashboardText, { color: colors.primary }]}>
            {profileSetupCopy.actions.backToDashboard}
          </Text>
        </Pressable>
      ) : null}
      <Pressable onPress={onSignOut ?? onPress} style={styles.link}>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {profileSetupCopy.actions.backToLogin}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.lg,
  },
  link: {
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  dashboardText: {
    textAlign: "center",
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
  },
  text: {
    textAlign: "center",
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
  },
});
