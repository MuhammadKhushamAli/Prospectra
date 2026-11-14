import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { useTargetIndustries } from "../../hooks/useTargetIndustries";
import { getSupabaseClient } from "../../config/supabaseClient";
import { checkUserOnboardingStatus } from "../../services/onboardingService";
import { fetchProfileFullNameFromDb } from "../../services/profileService";
import NotificationBanner from "../ui/NotificationBanner";
import TargetIndustriesHeader from "./TargetIndustriesHeader";
import TargetIndustriesForm from "./TargetIndustriesForm";
import TargetIndustriesFooterLink from "./TargetIndustriesFooterLink";
import type { NotificationVariant } from "../../types/ui";
import {
  notificationVariant,
  targetIndustriesCopy,
} from "../../constants/constants";

export default function TargetIndustriesScreen() {
  const colors = useTheme();
  const { saveTargetIndustries, fetchTargetIndustries, isLoading } =
    useTargetIndustries();
  const [userName, setUserName] = useState<string>("");
  const [initialIndustries, setInitialIndustries] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [notification, setNotification] = useState<{
    variant: NotificationVariant;
    message: string;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function init() {
        try {
          const status = await checkUserOnboardingStatus();
          if (!isMounted) return;
          if (
            status.targetRoute === "/auth" ||
            status.targetRoute === "/organization-registration" ||
            status.targetRoute === "/domain-verification" ||
            status.targetRoute === "/email-verification"
          ) {
            router.replace(status.targetRoute as any);
            return;
          }
          // Fetch current target industries
          const existing = await fetchTargetIndustries();
          if (isMounted && existing && existing.length > 0) {
            setInitialIndustries(existing);
          }

          // Fetch user full name directly from user_profiles table in DB
          const supabase = getSupabaseClient();
          const { data: sessionData } = await supabase.auth.getSession();
          const currentUserId = sessionData?.session?.user?.id;
          if (isMounted && currentUserId) {
            const dbFullName = await fetchProfileFullNameFromDb(
              supabase,
              currentUserId,
            );
            if (isMounted && dbFullName) {
              setUserName(dbFullName);
            }
          }
        } catch {
          if (isMounted) {
            router.replace("/auth");
          }
        } finally {
          if (isMounted) {
            setIsInitializing(false);
          }
        }
      }

      init();

      return () => {
        isMounted = false;
      };
    }, [fetchTargetIndustries]),
  );

  const handleSaveIndustries = async (industries: string[]) => {
    setNotification(null);
    try {
      await saveTargetIndustries(industries);
      setNotification({
        variant: notificationVariant.success,
        message: targetIndustriesCopy.success,
      });
      // Profile is now considered complete! Advance to Dashboard
      router.replace("/home");
    } catch (err: any) {
      const msg =
        err?.message || "Failed to save target industries. Please try again.";
      setNotification({
        variant: notificationVariant.error,
        message: msg,
      });
    }
  };

  const handleBackToProfile = () => {
    router.replace("/profile-setup");
  };

  const handleBackToDashboard = () => {
    router.replace("/home");
  };

  const handleSignOut = async () => {
    try {
      await getSupabaseClient().auth.signOut();
    } catch {
      // ignore
    }
    router.replace("/auth");
  };

  if (isInitializing) {
    return (
      <View
        style={[styles.loadingScreen, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
          <TargetIndustriesHeader userName={userName} />
          <TargetIndustriesForm
            initialIndustries={initialIndustries}
            onSubmit={handleSaveIndustries}
            isLoading={isLoading}
          />
          <TargetIndustriesFooterLink
            onBackToProfile={handleBackToProfile}
            onBackToDashboard={handleBackToDashboard}
            onSignOut={handleSignOut}
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
    maxWidth: 460,
    alignSelf: "center",
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xl,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
