import { useEffect, useState } from "react";
import { AccessibilityInfo, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import AuthFooterLink from "./AuthFooterLink";
import AuthHeader from "./AuthHeader";
import AuthModeSwitch from "./AuthModeSwitch";
import Divider from "../ui/Divider";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import SocialAuthButton from "./SocialAuthButton";

export default function AuthScreen() {
  const colors = useTheme();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [reducedMotion, setReducedMotion] = useState(false);
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion); const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion); return () => sub.remove(); }, []);
  const changeMode = (next: "login" | "signup") => { setMode(next); opacity.value = reducedMotion ? 1 : 0; translateX.value = reducedMotion ? 0 : next === "login" ? -6 : 6; opacity.value = reducedMotion ? 1 : withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) }); translateX.value = reducedMotion ? 0 : withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) }); };
  const animatedForm = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateX: translateX.value }] }));
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><AuthHeader mode={mode} /><AuthModeSwitch mode={mode} onChange={changeMode} reducedMotion={reducedMotion} /><Animated.View style={animatedForm}>{mode === "login" ? <LoginForm /> : <SignupForm />}</Animated.View><Divider /><SocialAuthButton /><AuthFooterLink mode={mode} onPress={() => changeMode(mode === "login" ? "signup" : "login")} /></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, flex: { flex: 1 }, content: { flexGrow: 1, width: "100%", maxWidth: 420, alignSelf: "center", paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg, paddingBottom: tokens.spacing.xl } });
