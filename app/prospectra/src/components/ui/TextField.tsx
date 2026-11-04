import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

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
            backgroundColor: error ? colors.errorSoft : colors.surface,
            borderColor: error
              ? colors.error
              : focused
                ? colors.primary
                : colors.border,
          },
          focused && [
            styles.focusedRing,
            { shadowColor: error ? colors.error : colors.primary },
          ],
          inputWrapStyle,
        ]}
      >
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          textAlignVertical={
            props.textAlignVertical ?? (isMultiline ? "top" : "center")
          }
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
        <Text
          accessibilityRole="alert"
          style={[styles.error, { color: colors.error }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: tokens.spacing.xs,
  },
  label: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  inputWrap: {
    height: 40,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    flexDirection: "row",
    alignItems: "center",
  },
  focusedRing: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 1,
  },
  inputWrapMultiline: {
    height: undefined,
    minHeight: 104,
    alignItems: "flex-start",
  },
  input: {
    flex: 1,
    paddingHorizontal: tokens.spacing.sm + 4,
    paddingVertical: tokens.spacing.sm,
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  inputMultiline: {
    minHeight: 96,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
  },
  error: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
});
