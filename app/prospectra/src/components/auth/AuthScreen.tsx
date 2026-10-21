import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { useLogin } from "../../hooks/useLogin";
import { useSignup } from "../../hooks/useSignup";
import type {
  AuthMode,
  LoginCredentials,
  SignupCredentials,
} from "../../types/auth";
import type { NotificationVariant } from "../../types/ui";
import { router } from "expo-router";
import { validateLogin, validateSignup } from "../../validation/authValidation";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { checkUserOnboardingStatus } from "../../services/onboardingService";
import NotificationBanner from "../ui/NotificationBanner";
import AuthFooterLink from "./AuthFooterLink";
import AuthHeader from "./AuthHeader";
import AuthModeSwitch from "./AuthModeSwitch";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import {
  authCopy,
  authMode,
  notificationVariant,
} from "../../constants/constants";

export default function AuthScreen() {
  const colors = useTheme();
  const { login, isLoading: isLoggingIn } = useLogin();
  const { signup } = useSignup();
  const [mode, setMode] = useState<AuthMode>(authMode.login);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [notification, setNotification] = useState<{
    variant: NotificationVariant;
    message: string;
  } | null>(null);
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    return () => sub.remove();
  }, []);

  // When user opens auth screen with an existing matched token, evaluate and redirect
  useEffect(() => {
    let isMounted = true;
    checkUserOnboardingStatus().then((status) => {
      if (isMounted && status.isAuthenticated) {
        router.replace(status.targetRoute as any);
      }
    });
    return () => {
      isMounted = false; 
    };
  }, []);

  const changeMode = (next: AuthMode) => {
    setMode(next);
    setNotification(null);
    opacity.value = reducedMotion ? 1 : 0;
    translateX.value = reducedMotion ? 0 : next === authMode.login ? -6 : 6;
    opacity.value = reducedMotion
      ? 1
      : withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) });
    translateX.value = reducedMotion
      ? 0
      : withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) });
  };

  const handleLogin = async (credentials: LoginCredentials) => {
    const validationError = validateLogin(credentials);
    if (validationError) {
      setNotification({
        variant: notificationVariant.error,
        message: validationError,
      });
      return;
    }
    try {
      await login(credentials);
      setNotification({
        variant: notificationVariant.success,
        message: authCopy.login.success,
      });
      const status = await checkUserOnboardingStatus();
      router.replace(status.targetRoute as any);
    } catch (error) {
      setNotification({
        variant: notificationVariant.error,
        message: getErrorMessage(error),
      });
    }
  };

  const handleSignup = async (
    credentials: SignupCredentials,
    confirmPassword: string,
  ) => {
    const validationError = validateSignup(credentials, confirmPassword);
    if (validationError) {
      setNotification({
        variant: notificationVariant.error,
        message: validationError,
      });
      return;
    }
    try {
      await signup(credentials);
      setNotification({
        variant: notificationVariant.success,
        message: authCopy.signup.success,
      });
      router.replace("/profile-setup" as any);
    } catch (error) {
      setNotification({
        variant: notificationVariant.error,
        message: getErrorMessage(error),
      });
    }
  };

  const animatedForm = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {notification ? (
        <NotificationBanner
          variant={notification.variant}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      ) : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <AuthHeader mode={mode} />
          <AuthModeSwitch
            mode={mode}
            onChange={changeMode}
            reducedMotion={reducedMotion}
          />
          <Animated.View style={animatedForm}>
            {mode === authMode.login ? (
              <LoginForm onSubmit={handleLogin} isLoading={isLoggingIn} />
            ) : (
              <SignupForm onSubmit={handleSignup} />
            )}
          </Animated.View>
          <AuthFooterLink
            mode={mode}
            onPress={() =>
              changeMode(
                mode === authMode.login ? authMode.signup : authMode.login,
              )
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xl,
  },
});
