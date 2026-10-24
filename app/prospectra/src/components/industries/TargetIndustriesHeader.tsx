import { Image, StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { appName, targetIndustriesCopy } from "../../constants/constants";
import type { TargetIndustriesHeaderProps } from "../../types/industries";

export default function TargetIndustriesHeader({
  userName,
}: TargetIndustriesHeaderProps) {
  const colors = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.brand}>
          <Image source={colors.icon} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.brandName, { color: colors.text }]}>
            {appName}
          </Text>
        </View>
        <View
          style={[
            styles.stepBadge,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.stepBadgeText, { color: colors.primary }]}>
            Step 2 of 2
          </Text>
        </View>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: colors.text }]}>
          {targetIndustriesCopy.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {userName ? `${userName}, ` : ""}
          {targetIndustriesCopy.subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: tokens.spacing.lg,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  logo: {
    width: 36,
    height: 36,
  },
  brandName: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
  },
  stepBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  stepBadgeText: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.xs,
    letterSpacing: 0.3,
  },
  titleBlock: {
    marginTop: tokens.spacing.auth,
  },
  title: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.authTitle,
    lineHeight: tokens.fontSize.xl,
  },
  subtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.authSubtitle,
    lineHeight: tokens.fontSize.lg,
    marginTop: tokens.spacing.sm,
  },
});
