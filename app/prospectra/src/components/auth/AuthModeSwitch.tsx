import { useEffect } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";

interface AuthModeSwitchProps { mode: "login" | "signup"; onChange: (mode: "login" | "signup") => void; reducedMotion?: boolean; }

export default function AuthModeSwitch({ mode, onChange, reducedMotion = false }: AuthModeSwitchProps) {
  const colors = useTheme();
  const width = useSharedValue(0);
  const translateX = useSharedValue(0);
  useEffect(() => { translateX.value = reducedMotion ? (mode === "login" ? 0 : width.value / 2) : withTiming(mode === "login" ? 0 : width.value / 2, { duration: 200, easing: Easing.out(Easing.cubic) }); }, [mode, reducedMotion, translateX, width]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const onLayout = (event: LayoutChangeEvent) => { width.value = event.nativeEvent.layout.width; translateX.value = mode === "login" ? 0 : width.value / 2; };
  return <View onLayout={onLayout} style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}><Animated.View style={[styles.indicator, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, width: "50%" }, indicator]} /><Pressable onPress={() => onChange("login")} style={styles.option}><Text style={[styles.text, { color: mode === "login" ? colors.text : colors.textSecondary }]}>Log in</Text></Pressable><Pressable onPress={() => onChange("signup")} style={styles.option}><Text style={[styles.text, { color: mode === "signup" ? colors.text : colors.textSecondary }]}>Sign up</Text></Pressable></View>;
}

const styles = StyleSheet.create({ container: { height: 44, borderWidth: 1, borderRadius: tokens.radius.lg, flexDirection: "row", overflow: "hidden", position: "relative", marginBottom: tokens.spacing.lg }, indicator: { position: "absolute", top: 1, bottom: 1, left: 1, borderWidth: 1, borderRadius: tokens.radius.lg }, option: { flex: 1, alignItems: "center", justifyContent: "center", zIndex: 1 }, text: { fontFamily: "DMSansMedium", fontSize: tokens.fontSize.md } });
