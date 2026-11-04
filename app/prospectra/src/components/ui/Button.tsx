import { Pressable, StyleSheet, Text } from "react-native";

import { tokens } from "../../constants/theme";
import { buttonVariant } from "../../constants/constants";
import { useTheme } from "../../hooks/useTheme";
import type { ButtonProps } from "../../types/ui";

export type { ButtonProps };

export default function Button({
  label,
  variant = buttonVariant.primary,
  onPress,
  disabled = false,
}: ButtonProps) {
  const colors = useTheme();
  const primary = variant === buttonVariant.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        primary
          ? [
              styles.primaryShadow,
              {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]
          : [
              styles.secondaryShadow,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ],
        {
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: primary ? colors.onPrimary : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 40,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.md,
  },
  primaryShadow: {
    ...tokens.shadow.sm,
  },
  secondaryShadow: {
    ...tokens.shadow.sm,
  },
  label: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
});
