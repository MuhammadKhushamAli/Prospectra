import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { authCopy } from "../../constants/constants";
import { useTheme } from "../../hooks/useTheme";
import TextField from "./TextField";
import type { PasswordFieldProps } from "../../types/ui";

export type { PasswordFieldProps };

export default function PasswordField({
  label,
  placeholder,
  ...props
}: PasswordFieldProps) {
  const colors = useTheme();
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <TextField
      {...props}
      label={label}
      placeholder={placeholder}
      secureTextEntry={!visible}
      rightSlot={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            visible
              ? authCopy.passwordVisibility.hide
              : authCopy.passwordVisibility.show
          }
          hitSlop={tokens.spacing.sm}
          onPress={() => setVisible((value) => !value)}
          style={({ pressed }) => [
            styles.toggle,
            { opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <Icon color={colors.textSecondary} size={16} strokeWidth={1.75} />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  toggle: {
    paddingHorizontal: tokens.spacing.sm + 4,
    paddingVertical: tokens.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
