import { useEffect, useState } from "react";
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
import { useOrganization } from "../../hooks/useOrganization";
import { getSupabaseClient } from "../../config/supabaseClient";
import { checkUserOnboardingStatus } from "../../services/onboardingService";
import NotificationBanner from "../ui/NotificationBanner";
import OrganizationRegistrationHeader from "./OrganizationRegistrationHeader";
import OrganizationRegistrationForm from "./OrganizationRegistrationForm";
import OrganizationRegistrationFooterLink from "./OrganizationRegistrationFooterLink";
import type { NotificationVariant } from "../../types/ui";
import {
  notificationVariant,
  organizationRegistrationCopy,
} from "../../constants/constants";

export default function OrganizationRegistrationScreen() {
  const colors = useTheme();
  const { registerOrganization, isLoading } = useOrganization();
  const [notification, setNotification] = useState<{
    variant: NotificationVariant;
    message: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    checkUserOnboardingStatus().then((status) => {
      if (!isMounted) return;
      if (!status.isAuthenticated) {
        router.replace(status.targetRoute as any);
        return;
      }
      if (status.targetRoute !== "/organization-registration") {
        router.replace(status.targetRoute as any);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRegister = async (params: {
    name: string;
    pending_threshold: number;
  }) => {
    setNotification(null);
    try {
      await registerOrganization(params);
      setNotification({
        variant: notificationVariant.success,
        message: organizationRegistrationCopy.success,
      });
      // Move to domain verification as requested
      router.replace("/domain-verification");
    } catch (err: any) {
      const msg =
        err?.message ||
        "Failed to register organization. Please try again.";
      setNotification({
        variant: notificationVariant.error,
        message: msg,
      });
    }
  };

  const handleBackToLogin = async () => {
    try {
      await getSupabaseClient().auth.signOut();
    } catch {
      // ignore
    }
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
          <OrganizationRegistrationHeader />
          <OrganizationRegistrationForm
            onSubmit={handleRegister}
            isLoading={isLoading}
          />
          <OrganizationRegistrationFooterLink onPress={handleBackToLogin} />
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
