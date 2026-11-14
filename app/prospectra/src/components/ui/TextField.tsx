import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";

import type { TextFieldProps } from "../../types/ui";

export type { TextFieldProps };

interface FocusBorderHandle {
  setFocused: (focused: boolean) => void;
}

const FocusBorderOverlay = forwardRef<
  FocusBorderHandle,
  { borderColor: string }
>(function FocusBorderOverlay({ borderColor }, ref) {
  const [focused, setFocused] = useState(false);

  useImperativeHandle(ref, () => ({ setFocused }), []);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.focusBorder,
        {
          borderColor,
          opacity: focused ? 1 : 0,
        },
      ]}
    />
  );
});

export default function TextField({
  label,
  rightSlot,
  error,
  inputWrapStyle,
  style,
  accessibilityLabel,
  textAlignVertical,
  onFocus,
  onBlur,
  ...props
}: TextFieldProps) {
  const colors = useTheme();
  const focusBorderRef = useRef<FocusBorderHandle>(null);
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
            borderColor: error ? colors.error : colors.border,
          },
          inputWrapStyle,
        ]}
      >
        <TextInput
          {...props}
          accessibilityLabel={accessibilityLabel ?? label}
          textAlignVertical={
            textAlignVertical ?? (isMultiline ? "top" : "center")
          }
          onFocus={(event) => {
            focusBorderRef.current?.setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            focusBorderRef.current?.setFocused(false);
            onBlur?.(event);
          }}
          placeholderTextColor={colors.placeholder}
          style={[
            styles.input,
            isMultiline && styles.inputMultiline,
            { color: colors.text },
            style,
          ]}
        />
        {rightSlot}
        <FocusBorderOverlay
          ref={focusBorderRef}
          borderColor={error ? colors.error : colors.primary}
        />
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
    position: "relative",
    height: 40,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    flexDirection: "row",
    alignItems: "center",
  },
  focusBorder: {
    position: "absolute",
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderWidth: 1.5,
    borderRadius: tokens.radius.md,
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
