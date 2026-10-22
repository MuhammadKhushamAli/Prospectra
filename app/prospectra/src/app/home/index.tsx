import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { getSupabaseClient } from "../../config/supabaseClient";
import { checkUserOnboardingStatus } from "../../services/onboardingService";
import type { UserOnboardingStatus } from "../../types/onboarding";
import {
  appName,
  buttonVariant,
  homeCopy,
  notificationVariant,
} from "../../constants/constants";
import type { NotificationVariant } from "../../types/ui";
import Button from "../../components/ui/Button";
import NotificationBanner from "../../components/ui/NotificationBanner";

export default function HomeRoute() {
  const colors = useTheme();
  const [status, setStatus] = useState<UserOnboardingStatus | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{
    variant: NotificationVariant;
    message: string;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function loadData() {
        try {
          const onboarding = await checkUserOnboardingStatus();
          if (!isMounted) return;
          if (onboarding.targetRoute !== "/home") {
            router.replace(onboarding.targetRoute as any);
            return;
          }

          setStatus(onboarding);

          const supabase = getSupabaseClient();
          const { data: sessionData } = await supabase.auth.getSession();
          if (isMounted) {
            setUserEmail(sessionData?.session?.user?.email ?? null);
          }
        } catch {
          if (isMounted) {
            router.replace("/auth");
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }

      loadData();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const handleSignOut = async () => {
    try {
      await getSupabaseClient().auth.signOut();
    } catch {
      // ignore
    }
    router.replace("/auth");
  };

  const handleCompleteProfile = () => {
    router.push("/profile-setup");
  };

  const hasProfile = Boolean(status?.hasProfile);

  const handlePerformOperation = (operationName: string) => {
    if (!hasProfile) {
      setNotification({
        variant: notificationVariant.error,
        message: homeCopy.operationsLockedAlert,
      });
      return;
    }

    if (operationName === homeCopy.actions.startProspecting) {
      router.push("/prospecting" as any);
      return;
    }

    setNotification({
      variant: notificationVariant.success,
      message: `${operationName} initialized successfully.`,
    });
  };

  if (isLoading) {
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
      <ScrollView contentContainerStyle={styles.content}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <Image
              source={colors.icon}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.brandName, { color: colors.text }]}>
              {appName}
            </Text>
          </View>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutBtn,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.signOutText, { color: colors.textSecondary }]}>
              {homeCopy.actions.signOut}
            </Text>
          </Pressable>
        </View>

        {/* Welcome Header */}
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: colors.text }]}>
            {homeCopy.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {homeCopy.subtitle}
          </Text>
          {userEmail ? (
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {homeCopy.user}:{" "}
              <Text
                style={{ color: colors.text, fontFamily: "DMSansSemiBold" }}
              >
                {userEmail}
              </Text>
            </Text>
          ) : null}
          {hasProfile && status?.headline ? (
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              Headline:{" "}
              <Text style={{ color: colors.text, fontFamily: "DMSansMedium" }}>
                {status.headline}
              </Text>
            </Text>
          ) : null}
        </View>

        {/* Cards container */}
        <View style={styles.cardsGrid}>
          {/* Profile Card: Incomplete Action Required vs Configured */}
          {!hasProfile ? (
            <View
              style={[
                styles.card,
                styles.incompleteProfileCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.warning,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleWithIcon}>
                  <AlertCircle
                    color={colors.warning}
                    size={18}
                    strokeWidth={2}
                  />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {homeCopy.profileIncompleteTitle}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: colors.warning },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: colors.surfaceElevated },
                    ]}
                  >
                    {homeCopy.lockedBadge}
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.cardDescription, { color: colors.textSecondary }]}
              >
                {homeCopy.profileIncompleteDesc}
              </Text>
              <View style={styles.actionRow}>
                <Button
                  label={homeCopy.completeProfileButton}
                  variant={buttonVariant.primary}
                  onPress={handleCompleteProfile}
                />
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleWithIcon}>
                  <CheckCircle2
                    color={colors.success}
                    size={18}
                    strokeWidth={2}
                  />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    Professional Profile
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: colors.success },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: colors.surfaceElevated },
                    ]}
                  >
                    {homeCopy.profileCompleteBadge}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardMainValue, { color: colors.text }]}>
                {status?.headline || "Profile Configured"}
              </Text>
              <View style={styles.actionRow}>
                <Button
                  label={homeCopy.editProfile}
                  variant={buttonVariant.ghost}
                  onPress={handleCompleteProfile}
                />
              </View>
            </View>
          )}

          {/* Organization Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {homeCopy.organization}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: colors.onPrimary },
                  ]}
                >
                  {homeCopy.statusActive}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardMainValue, { color: colors.text }]}>
              {status?.orgName || "Primary Workspace"}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              Workspace ID:{" "}
              {status?.orgId ? `${status.orgId.slice(0, 8)}...` : ""}
            </Text>
          </View>

          {/* Domain Verification Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.success,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {homeCopy.domain}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: colors.success },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: colors.surfaceElevated },
                  ]}
                >
                  {homeCopy.verifiedBadge}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardMainValue, { color: colors.text }]}>
              {status?.domain || "Authenticated Domain"}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              DNS records verified & synced.
            </Text>
          </View>

          {/* Workspace Operations Card */}
          <View
            style={[
              styles.readyCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: !hasProfile ? colors.warning : colors.border,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.titleWithIcon}>
                {!hasProfile ? (
                  <Lock color={colors.warning} size={18} strokeWidth={2} />
                ) : null}
                <Text style={[styles.readyTitle, { color: colors.text }]}>
                  {!hasProfile ? "Workspace Operations" : homeCopy.readyTitle}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: !hasProfile
                      ? colors.warning
                      : colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: !hasProfile
                        ? colors.surfaceElevated
                        : colors.onPrimary,
                    },
                  ]}
                >
                  {!hasProfile ? homeCopy.lockedBadge : homeCopy.statusActive}
                </Text>
              </View>
            </View>
            <Text style={[styles.readyDesc, { color: colors.textSecondary }]}>
              {!hasProfile
                ? homeCopy.operationsLockedAlert
                : homeCopy.readyDescription}
            </Text>

            {/* Operations action buttons */}
            <View style={styles.operationsGrid}>
              <Pressable
                onPress={() =>
                  handlePerformOperation(homeCopy.actions.startProspecting)
                }
                style={({ pressed }) => [
                  styles.operationButton,
                  !hasProfile
                    ? {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        opacity: pressed ? 0.6 : 0.85,
                      }
                    : {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                        opacity: pressed ? 0.85 : 1,
                      },
                ]}
              >
                {!hasProfile ? (
                  <Lock color={colors.textDisabled} size={16} strokeWidth={2} />
                ) : null}
                <Text
                  style={[
                    styles.operationButtonText,
                    {
                      color: !hasProfile
                        ? colors.textDisabled
                        : colors.onPrimary,
                    },
                  ]}
                >
                  {!hasProfile
                    ? homeCopy.actions.lockedAction
                    : homeCopy.actions.startProspecting}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.xl,
    gap: tokens.spacing.lg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  logo: {
    width: 36,
    height: 36,
  },
  brandName: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
  },
  signOutBtn: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
  },
  signOutText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
  headerBlock: {
    gap: tokens.spacing.xs,
  },
  title: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.authTitle,
    lineHeight: tokens.fontSize.xl,
  },
  subtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.authSubtitle,
    lineHeight: tokens.fontSize.lg,
  },
  userEmail: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    marginTop: tokens.spacing.xs,
  },
  cardsGrid: {
    gap: tokens.spacing.md,
  },
  card: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    gap: tokens.spacing.xs,
  },
  incompleteProfileCard: {
    borderLeftWidth: 4,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: tokens.spacing.xs,
  },
  cardTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
  },
  statusBadgeText: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.xs,
    letterSpacing: 0.5,
  },
  cardMainValue: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.lg,
  },
  cardDescription: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
    marginBottom: tokens.spacing.xs,
  },
  actionRow: {
    marginTop: tokens.spacing.xs,
  },
  cardMeta: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
  },
  readyCard: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    gap: tokens.spacing.sm,
  },
  readyTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
  },
  readyDesc: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  operationsGrid: {
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  operationButton: {
    height: 46,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
  },
  operationButtonText: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
  },
});
