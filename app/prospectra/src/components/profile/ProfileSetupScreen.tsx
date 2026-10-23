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
import { useProfile } from "../../hooks/useProfile";
import { getSupabaseClient } from "../../config/supabaseClient";
import { checkUserOnboardingStatus } from "../../services/onboardingService";
import NotificationBanner from "../ui/NotificationBanner";
import ProfileSetupHeader from "./ProfileSetupHeader";
import ProfileSetupForm from "./ProfileSetupForm";
import ProfileSetupFooterLink from "./ProfileSetupFooterLink";
import type { NotificationVariant } from "../../types/ui";
import {
  notificationVariant,
  profileSetupCopy,
} from "../../constants/constants";

export default function ProfileSetupScreen() {
  const colors = useTheme();
  const { updateProfile, getProfile, isLoading } = useProfile();
  const [userName, setUserName] = useState<string>("");
  const [initialHeadline, setInitialHeadline] = useState<string>("");
  const [initialSkills, setInitialSkills] = useState<string[]>([]);
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
          if (!status.isAuthenticated && status.targetRoute !== "/profile-setup") {
            router.replace(status.targetRoute);
            return;
          }

          // Load profile directly from database tables
          const profile = await getProfile();
          if (isMounted && profile) {
            setUserName(profile.fullName || "");
            setInitialHeadline(profile.headline || "");
            setInitialSkills(profile.skills || []);
          } else if (isMounted) {
            const supabase = getSupabaseClient();
            const { data: userData } = await supabase.auth.getUser();
            const fullName =
              userData?.user?.user_metadata?.full_name ||
              userData?.user?.user_metadata?.name ||
              "";
            setUserName(fullName);
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
    }, [getProfile]),
  );

  const handleSaveProfile = async (params: {
    headline: string;
    skills: string[];
  }) => {
    setNotification(null);
    try {
      await updateProfile(params);
      setNotification({
        variant: notificationVariant.success,
        message: profileSetupCopy.success,
      });
      // Advance to Dashboard
      router.replace("/home");
    } catch (err: any) {
      const msg =
        err?.message || "Failed to save profile. Please try again.";
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
        >
          <ProfileSetupHeader userName={userName} />
          <ProfileSetupForm
            initialHeadline={initialHeadline}
            initialSkills={initialSkills}
            onSubmit={handleSaveProfile}
            isLoading={isLoading}
          />
          <ProfileSetupFooterLink
            onBackToDashboard={() => router.replace("/home")}
            onSignOut={handleBackToLogin}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
