import { Pressable, StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { authCopy, authMode } from "../../constants/constants";
import type { AuthModeSwitchProps } from "../../types/auth";

export type { AuthModeSwitchProps };

export default function AuthModeSwitch({
  mode,
  onChange,
}: AuthModeSwitchProps) {
  const colors = useTheme();
  const isLogin = mode === authMode.login;
  const isSignup = mode === authMode.signup;

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: isLogin }}
        onPress={() => onChange(authMode.login)}
        style={[
          styles.option,
          isLogin && [
            styles.activeOption,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ],
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              color: isLogin ? colors.text : colors.textSecondary,
              fontFamily: isLogin ? "DMSansSemiBold" : "DMSansMedium",
            },
          ]}
        >
          {authCopy.tabs.login}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: isSignup }}
        onPress={() => onChange(authMode.signup)}
        style={[
          styles.option,
          isSignup && [
            styles.activeOption,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ],
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              color: isSignup ? colors.text : colors.textSecondary,
              fontFamily: isSignup ? "DMSansSemiBold" : "DMSansMedium",
            },
          ]}
        >
          {authCopy.tabs.signup}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: tokens.spacing.lg,
    padding: tokens.spacing.xs - 1,
  },
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  activeOption: {
    ...tokens.shadow.sm,
  },
  text: {
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
});
