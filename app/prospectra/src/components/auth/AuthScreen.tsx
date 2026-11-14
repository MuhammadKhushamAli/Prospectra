import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let isMounted = true;
    checkUserOnboardingStatus().then((status) => {
      if (isMounted && status.targetRoute !== "/auth") {
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
      router.replace("/organization-registration" as any);
    } catch (error) {
      setNotification({
        variant: notificationVariant.error,
        message: getErrorMessage(error),
      });
    }
  };

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
          showsVerticalScrollIndicator={false}
        >
          <AuthHeader mode={mode} />

          <View
            style={[
              styles.authCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <AuthModeSwitch
              mode={mode}
              onChange={changeMode}
              reducedMotion={reducedMotion}
            />
            <View>
              {mode === authMode.login ? (
                <LoginForm onSubmit={handleLogin} isLoading={isLoggingIn} />
              ) : (
                <SignupForm onSubmit={handleSignup} />
              )}
            </View>
          </View>

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
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xl,
    paddingBottom: tokens.spacing.xl,
    justifyContent: "center",
  },
  authCard: {
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    ...tokens.shadow.sm,
  },
});
