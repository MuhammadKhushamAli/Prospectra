import { Pressable, StyleSheet, Text } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";

interface ButtonProps {
  label: string;
  variant?: "primary" | "ghost";
  onPress?: () => void;
}

export default function Button({
  label,
  variant = "primary",
  onPress,
}: ButtonProps) {
  const colors = useTheme();
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { borderColor: colors.border },
        { opacity: pressed ? 0.85 : 1 },
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
