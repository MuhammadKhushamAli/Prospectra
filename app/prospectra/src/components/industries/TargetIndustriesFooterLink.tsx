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
        <Pressable onPress={onBackToProfile} style={styles.link}>
          <Text style={[styles.profileText, { color: colors.primary }]}>
            ← {targetIndustriesCopy.actions.backToProfile}
          </Text>
        </Pressable>
      ) : null}

      {onBackToDashboard ? (
        <Pressable onPress={onBackToDashboard} style={styles.link}>
          <Text style={[styles.dashboardText, { color: colors.textSecondary }]}>
            {targetIndustriesCopy.actions.backToDashboard}
          </Text>
        </Pressable>
      ) : null}

      {onSignOut ? (
        <Pressable onPress={onSignOut} style={styles.link}>
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
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
  },
  dashboardText: {
    textAlign: "center",
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
  },
  text: {
    textAlign: "center",
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
  },
});
