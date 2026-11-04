import { Image, StyleSheet, Text, View } from "react-native";
import { Compass } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { appName, authCopy, authMode } from "../../constants/constants";
import type { AuthHeaderProps } from "../../types/auth";

export type { AuthHeaderProps };

export default function AuthHeader({ mode }: AuthHeaderProps) {
  const colors = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.brand}>
          <View
            style={[
              styles.logoWrap,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Image
              source={colors.icon}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.brandName, { color: colors.text }]}>
            {appName}
          </Text>
        </View>

        <View
          style={[
            styles.platformPill,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Compass size={12} color={colors.textSecondary} strokeWidth={1.75} />
          <Text
            style={[styles.platformPillText, { color: colors.textSecondary }]}
          >
            AI B2B Outbound
          </Text>
        </View>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: colors.text }]}>
          {mode === authMode.login
            ? authCopy.login.title
            : authCopy.signup.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {mode === authMode.login
            ? authCopy.login.subtitle
            : authCopy.signup.subtitle}
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
  logoWrap: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 20,
    height: 20,
  },
  brandName: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    letterSpacing: -0.3,
  },
  platformPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  platformPillText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  titleBlock: {
    marginTop: tokens.spacing.lg,
  },
  title: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xl,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
    marginTop: tokens.spacing.xs,
  },
});
