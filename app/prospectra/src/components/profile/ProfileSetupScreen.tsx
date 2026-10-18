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
  const { updateProfile, isLoading } = useProfile();
  const [userName, setUserName] = useState<string>("");
  const [initialHeadline, setInitialHeadline] = useState<string>("");
  const [notification, setNotification] = useState<{
    variant: NotificationVariant;
    message: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const status = await checkUserOnboardingStatus();
        if (!isMounted) return;

        if (!status.isAuthenticated) {
          router.replace("/auth");
          return;
        }

        // If user already completed profile, redirect them forward
        if (status.hasProfile) {
          router.replace(status.targetRoute as any);
          return;
        }

        const supabase = getSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (isMounted && sessionData?.session?.user) {
          const u = sessionData.session.user;
          const name = (u.user_metadata?.full_name as string) || "";
          setUserName(name);
          const hl = (u.user_metadata?.headline as string) || "";
          setInitialHeadline(hl);
        }
      } catch {
        if (isMounted) {
          router.replace("/auth");
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveProfile = async (headline: string) => {
    setNotification(null);
    try {
      await updateProfile({ headline });
      setNotification({
        variant: notificationVariant.success,
        message: profileSetupCopy.success,
      });
      // Advance to organization registration
      router.replace("/organization-registration");
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
            onSubmit={handleSaveProfile}
            isLoading={isLoading}
          />
          <ProfileSetupFooterLink onPress={handleBackToLogin} />
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
