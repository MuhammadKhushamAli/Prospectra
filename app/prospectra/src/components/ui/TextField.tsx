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

import type { TextFieldProps } from "../../types/ui";

export type { TextFieldProps };

export default function TextField({
  label,
  rightSlot,
  error,
  inputWrapStyle,
  ...props
}: TextFieldProps) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  const isMultiline = Boolean(props.multiline);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          isMultiline && styles.inputWrapMultiline,
          {
            backgroundColor: colors.surface,
            borderColor: error
              ? colors.error
              : focused
                ? colors.primary
                : colors.border,
          },
          inputWrapStyle,
        ]}
      >
        <TextInput
          {...props}
          textAlignVertical={props.textAlignVertical ?? (isMultiline ? "top" : "center")}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          placeholderTextColor={colors.placeholder}
          style={[
            styles.input,
            isMultiline && styles.inputMultiline,
            { color: colors.text },
            props.style,
          ]}
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
  inputWrapMultiline: {
    height: undefined,
    minHeight: 110,
    alignItems: "flex-start",
  },
  input: {
    flex: 1,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.md,
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
  },
  error: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    marginTop: 2,
  },
});
