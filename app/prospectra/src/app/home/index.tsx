import { useEffect, useState } from "react";
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
import { router } from "expo-router";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { getSupabaseClient } from "../../config/supabaseClient";
import { checkUserOnboardingStatus } from "../../services/onboardingService";
import type { UserOnboardingStatus } from "../../types/onboarding";
import { appName, buttonVariant, homeCopy } from "../../constants/constants";
import Button from "../../components/ui/Button";

export default function HomeRoute() {
  const colors = useTheme();
  const [status, setStatus] = useState<UserOnboardingStatus | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const handleSignOut = async () => {
    try {
      await getSupabaseClient().auth.signOut();
    } catch {
      // ignore
    }
    router.replace("/auth");
  };

  const handleManageDomain = () => {
    router.push("/domain-verification");
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <Image source={colors.icon} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.brandName, { color: colors.text }]}>{appName}</Text>
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
          <Text style={[styles.title, { color: colors.text }]}>{homeCopy.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {homeCopy.subtitle}
          </Text>
          {userEmail ? (
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {homeCopy.user}:{" "}
              <Text style={{ color: colors.text, fontFamily: "DMSansSemiBold" }}>
                {userEmail}
              </Text>
            </Text>
          ) : null}
          {status?.headline ? (
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
                <Text style={[styles.statusBadgeText, { color: colors.onPrimary }]}>
                  {homeCopy.statusActive}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardMainValue, { color: colors.text }]}>
              {status?.orgName || "Primary Workspace"}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              Workspace ID: {status?.orgId ? `${status.orgId.slice(0, 8)}...` : ""}
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
                <Text style={[styles.statusBadgeText, { color: colors.surfaceElevated }]}>
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

          {/* Ready Banner */}
          <View
            style={[
              styles.readyCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.readyTitle, { color: colors.text }]}>
              {homeCopy.readyTitle}
            </Text>
            <Text style={[styles.readyDesc, { color: colors.textSecondary }]}>
              {homeCopy.readyDescription}
            </Text>
            <View style={styles.readyActions}>
              <Button
                label={homeCopy.actions.manageDomain}
                variant={buttonVariant.ghost}
                onPress={handleManageDomain}
              />
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
  readyActions: {
    marginTop: tokens.spacing.xs,
  },
});
