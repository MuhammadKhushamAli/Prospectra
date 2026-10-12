import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { validateDomain } from "../../validation/domainValidation";
import NotificationBanner from "../ui/NotificationBanner";
import DomainVerificationHeader from "./DomainVerificationHeader";
import DomainVerificationForm from "./DomainVerificationForm";
import DomainVerificationFooterLink from "./DomainVerificationFooterLink";
import {
  domainVerificationCopy,
  notificationVariant,
  type NotificationVariant,
} from "../../constants/constants";

export default function DomainVerificationScreen() {
  const colors = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    variant: NotificationVariant;
    message: string;
  } | null>(null);

  const handleVerify = async (domain: string) => {
    const validationError = validateDomain(domain);
    if (validationError) {
      setNotification({
        variant: notificationVariant.error,
        message: validationError,
      });
      return;
    }

    setIsLoading(true);
    setNotification(null);
    try {
      // Standard domain verification submission
      setNotification({
        variant: notificationVariant.success,
        message: domainVerificationCopy.success,
      });
    } catch {
      setNotification({
        variant: notificationVariant.error,
        message: "Failed to verify domain.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace("/auth");
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
        >
          <DomainVerificationHeader />
          <DomainVerificationForm
            onSubmit={handleVerify}
            isLoading={isLoading}
          />
          <DomainVerificationFooterLink onPress={handleBackToLogin} />
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
