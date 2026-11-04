import { AlertCircle, CheckCircle2, X } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { notificationVariant } from "../../constants/constants";
import type { NotificationBannerProps } from "../../types/ui";

export type { NotificationBannerProps };

export default function NotificationBanner({
  variant,
  message,
  onDismiss,
}: NotificationBannerProps) {
  const colors = useTheme();
  const isError = variant === notificationVariant.error;
  const color = isError ? colors.error : colors.success;
  const softBg = isError ? colors.errorSoft : colors.successSoft;
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityLabel={message}
      onPress={onDismiss}
      style={({ pressed }) => [
        styles.banner,
        {
          backgroundColor: colors.surface,
          borderColor: isError ? colors.errorBorder : colors.successBorder,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: softBg,
            borderColor: isError ? colors.errorBorder : colors.successBorder,
          },
        ]}
      >
        <Icon color={color} size={16} strokeWidth={1.75} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color }]}>
          {isError ? notificationVariant.error : notificationVariant.success}
        </Text>
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      </View>
      <View style={styles.closeIconWrap}>
        <X size={16} color={colors.textSecondary} strokeWidth={1.75} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: tokens.spacing.md,
    left: tokens.spacing.lg,
    right: tokens.spacing.lg,
    maxWidth: 440,
    alignSelf: "center",
    zIndex: 20,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.sm + 4,
    paddingHorizontal: tokens.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm + 4,
    ...tokens.shadow.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    lineHeight: 16,
  },
  message: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  closeIconWrap: {
    padding: tokens.spacing.xs,
  },
});
