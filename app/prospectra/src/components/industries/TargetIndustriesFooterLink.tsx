import { Pressable, StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { targetIndustriesCopy } from "../../constants/constants";
import type { TargetIndustriesFooterLinkProps } from "../../types/industries";

export default function TargetIndustriesFooterLink({
  onBackToProfile,
  onBackToDashboard,
  onSignOut,
}: TargetIndustriesFooterLinkProps) {
  const colors = useTheme();

  return (
    <View style={styles.container}>
      {onBackToProfile ? (
        <Pressable
          accessibilityRole="button"
          onPress={onBackToProfile}
          style={({ pressed }) => [
            styles.link,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.profileText, { color: colors.text }]}>
            ← {targetIndustriesCopy.actions.backToProfile}
          </Text>
        </Pressable>
      ) : null}

      {onBackToDashboard ? (
        <Pressable
          accessibilityRole="button"
          onPress={onBackToDashboard}
          style={({ pressed }) => [
            styles.link,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text
            style={[styles.dashboardText, { color: colors.textSecondary }]}
          >
            {targetIndustriesCopy.actions.backToDashboard}
          </Text>
        </Pressable>
      ) : null}

      {onSignOut ? (
        <Pressable
          accessibilityRole="button"
          onPress={onSignOut}
          style={({ pressed }) => [
            styles.link,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            Sign out
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xl,
  },
  link: {
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  profileText: {
    textAlign: "center",
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  dashboardText: {
    textAlign: "center",
    fontFamily: "DMSans",
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
