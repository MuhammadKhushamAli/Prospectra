import { useEffect } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { authCopy, authMode } from "../../constants/constants";
import type { AuthModeSwitchProps } from "../../types/auth";

export type { AuthModeSwitchProps };

export default function AuthModeSwitch({
  mode,
  onChange,
  reducedMotion = false,
}: AuthModeSwitchProps) {
  const colors = useTheme();
  const width = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = reducedMotion
      ? mode === authMode.login
        ? 0
        : (width.value - 8) / 2
      : withTiming(mode === authMode.login ? 0 : (width.value - 8) / 2, {
          duration: 180,
          easing: Easing.out(Easing.cubic),
        });
  }, [mode, reducedMotion, translateX, width]);

  const indicator = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    width.value = event.nativeEvent.layout.width;
    translateX.value = mode === authMode.login ? 0 : (width.value - 8) / 2;
  };

  return (
    <View
      accessibilityRole="tablist"
      onLayout={onLayout}
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            width: "50%",
          },
          indicator,
        ]}
      />
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: mode === authMode.login }}
        onPress={() => onChange(authMode.login)}
        style={styles.option}
      >
        <Text
          style={[
            styles.text,
            {
              color:
                mode === authMode.login ? colors.text : colors.textSecondary,
              fontFamily:
                mode === authMode.login ? "DMSansSemiBold" : "DMSansMedium",
            },
          ]}
        >
          {authCopy.tabs.login}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: mode === authMode.signup }}
        onPress={() => onChange(authMode.signup)}
        style={styles.option}
      >
        <Text
          style={[
            styles.text,
            {
              color:
                mode === authMode.signup ? colors.text : colors.textSecondary,
              fontFamily:
                mode === authMode.signup ? "DMSansSemiBold" : "DMSansMedium",
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
    position: "relative",
    marginBottom: tokens.spacing.lg,
    padding: tokens.spacing.xs,
  },
  indicator: {
    position: "absolute",
    top: tokens.spacing.xs - 1,
    bottom: tokens.spacing.xs - 1,
    left: tokens.spacing.xs,
    borderWidth: 1,
    borderRadius: 6,
    ...tokens.shadow.sm,
  },
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  text: {
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
});
