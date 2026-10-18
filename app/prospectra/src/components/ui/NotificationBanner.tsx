import { AlertCircle, CheckCircle2 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { notificationVariant } from "../../constants/constants";
import type { NotificationBannerProps, NotificationVariant } from "../../types/ui";

export type { NotificationBannerProps };

export default function NotificationBanner({
  variant,
  message,
  onDismiss,
}: NotificationBannerProps) {
  const colors = useTheme();
  const isError = variant === notificationVariant.error;
  const color = isError ? colors.error : colors.success;
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <Pressable
      onPress={onDismiss}
      style={[
        styles.banner,
        { backgroundColor: colors.surface, borderColor: color },
      ]}
    >
      <Icon color={color} size={20} strokeWidth={1.8} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color }]}>
          {isError ? notificationVariant.error : notificationVariant.success}
        </Text>
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: tokens.spacing.sm,
    left: tokens.spacing.lg,
    right: tokens.spacing.lg,
    zIndex: 10,
    elevation: 4,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    flexDirection: "row",
    gap: tokens.spacing.sm,
  },
  copy: { flex: 1, gap: tokens.spacing.xs },
  title: { fontFamily: "DMSansSemiBold", fontSize: tokens.fontSize.sm },
  message: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: tokens.fontSize.lg,
  },
});
