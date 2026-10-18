import { Pressable, StyleSheet, Text } from "react-native";

import { tokens } from "../../constants/theme";
import { buttonVariant } from "../../constants/constants";
import { useTheme } from "../../hooks/useTheme";
import type { ButtonProps, ButtonVariant } from "../../types/ui";

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
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        primary
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { borderColor: colors.border },
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
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
    height: 48,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontFamily: "DMSansSemiBold", fontSize: tokens.fontSize.md },
});
