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
        <Pressable
          accessibilityRole="button"
          onPress={onBackToDashboard}
          style={({ pressed }) => [
            styles.link,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.dashboardText, { color: colors.text }]}>
            {profileSetupCopy.actions.backToDashboard}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={onSignOut ?? onPress}
        style={({ pressed }) => [
          styles.link,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
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
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.lg,
  },
  link: {
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  dashboardText: {
    textAlign: "center",
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  text: {
    textAlign: "center",
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
});
