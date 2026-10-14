import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";

interface TextFieldProps extends TextInputProps {
  label: string;
  rightSlot?: React.ReactNode;
  error?: string | null;
}

export default function TextField({
  label,
  rightSlot,
  error,
  ...props
}: TextFieldProps) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surface,
            borderColor: error
              ? colors.error
              : focused
                ? colors.primary
                : colors.border,
          },
        ]}
      >
        <TextInput
          {...props}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          placeholderTextColor={colors.placeholder}
          style={[styles.input, { color: colors.text }, props.style]}
        />
        {rightSlot}
      </View>
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: tokens.spacing.xs },
  label: { fontFamily: "DMSansMedium", fontSize: tokens.fontSize.sm },
  inputWrap: {
    height: 48,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.md,
  },
  error: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    marginTop: 2,
  },
});
