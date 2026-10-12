import { useState } from "react";
import { Pressable, StyleSheet, TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { authCopy } from "../../constants/constants";
import { useTheme } from "../../hooks/useTheme";
import TextField from "./TextField";

interface PasswordFieldProps extends TextInputProps {
  label: string;
  placeholder?: string;
}

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
          accessibilityLabel={visible ? authCopy.passwordVisibility.hide : authCopy.passwordVisibility.show}
          hitSlop={tokens.spacing.sm}
          onPress={() => setVisible((value) => !value)}
          style={styles.toggle}
        >
          <Icon color={colors.textSecondary} size={20} strokeWidth={1.75} />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({ toggle: { padding: tokens.spacing.sm } });
