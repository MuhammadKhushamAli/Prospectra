import { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  Building2,
  Globe,
  Mail,
  ShieldAlert,
} from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { getSupabaseClient } from "../../config/supabaseClient";
import { TABLES } from "../../constants/tables";
import { DB_KEYS } from "../../constants/dbKeys";
import {
  checkUserOnboardingStatus,
  resolveUserOrgMembership,
} from "../../services/onboardingService";
import {
  fetchProfileFullNameFromDb,
  formatDisplayName,
  isProfileComplete,
} from "../../services/profileService";
import type { UserIdCardProfile } from "../../types/profile";
import type { UserOnboardingStatus } from "../../types/onboarding";

async function fetchUserIdCardProfile(
  userId: string,
  fallbackName: string | null,
  fallbackEmail: string | null,
  onboarding: UserOnboardingStatus,
): Promise<UserIdCardProfile> {
  const supabase = getSupabaseClient();

  // 1. Fetch user full name from user_profiles or fallback to auth metadata
  const dbFullName = await fetchProfileFullNameFromDb(supabase, userId).catch(
    () => null,
  );
  const name = dbFullName || fallbackName;

  // 2. Role in organization (professional headline configured in profile setup)
  const role = onboarding.headline ?? null;

  // 3. Resolve organization ID and name fresh from DB
  const { orgId, orgName: resolvedOrgName } = await resolveUserOrgMembership(
    supabase,
    userId,
  );
  const organizationName = resolvedOrgName || onboarding.orgName || null;

  // 4. Fetch verified organization domain from DB
  let organizationDomain: string | null = null;
  if (orgId) {
    const { data: domainRec } = await supabase
      .from(TABLES.DOMAIN_VERIFICATIONS)
      .select(DB_KEYS.DOMAIN)
      .eq(DB_KEYS.ORG_ID, orgId)
      .limit(1)
      .maybeSingle();
    organizationDomain = domainRec?.domain ?? null;
  }

  return {
    name,
    organizationName,
    organizationDomain,
    email: fallbackEmail,
    role,
  };
}

export default function HomeRoute() {
  const colors = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const [profile, setProfile] = useState<UserIdCardProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Track whether profile was previously incomplete so returning from profile-setup flips 3D
  const wasIncompleteRef = useRef<boolean | null>(null);

  // Reanimated shared values (UI thread)
  const translateX = useSharedValue(0);
  const idleSwipeX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  // 0deg = Front face visible, 180deg = Back face visible
  const flipRotation = useSharedValue(0);
  const skeletonPulse = useSharedValue(0.45);

  const startIdleLeftSwipeAnimation = useCallback(() => {
    idleSwipeX.value = 0;
    idleSwipeX.value = withRepeat(
      withSequence(
        withDelay(
          1100,
          withTiming(-22, {
            duration: 500,
            easing: Easing.out(Easing.cubic),
          }),
        ),
        withSpring(0, {
          damping: 12,
          stiffness: 150,
          mass: 0.8,
        }),
        withDelay(1400, withTiming(0, { duration: 100 })),
      ),
      -1,
      false,
    );
  }, [idleSwipeX]);

  useEffect(() => {
    skeletonPulse.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 750, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.45, { duration: 750, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [skeletonPulse]);

  useEffect(() => {
    if (!isLoading) {
      startIdleLeftSwipeAnimation();
    }
    return () => {
      cancelAnimation(idleSwipeX);
    };
  }, [isLoading, idleSwipeX, startIdleLeftSwipeAnimation]);

  const complete = isProfileComplete(profile);

  const navigateFromCard = useCallback(() => {
    if (isProfileComplete(profile)) {
      router.push("/prospecting" as any);
    } else {
      router.push("/profile-setup");
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      // Immediately reset swipe position, opacity & restart subtle left-swipe hint when returning to Home
      translateX.value = 0;
      cardOpacity.value = 1;
      startIdleLeftSwipeAnimation();

      async function loadData() {
        try {
          const onboarding = await checkUserOnboardingStatus();
          if (!isMounted) return;
          if (onboarding.targetRoute !== "/home") {
            router.replace(onboarding.targetRoute as any);
            return;
          }

          const supabase = getSupabaseClient();
          const { data: sessionData } = await supabase.auth.getSession();
          const user = sessionData?.session?.user;
          if (!user) {
            router.replace("/auth");
            return;
          }

          const metaName =
            (user.user_metadata?.full_name as string) ||
            (user.user_metadata?.display_name as string) ||
            null;

          const fetchedProfile = await fetchUserIdCardProfile(
            user.id,
            metaName,
            user.email ?? null,
            onboarding,
          );

          if (!isMounted) return;

          const nowComplete = isProfileComplete(fetchedProfile);

          if (wasIncompleteRef.current === null) {
            // Initial mount: start on front (0deg) if complete, or flipped on back (180deg) if incomplete
            flipRotation.value = nowComplete ? 0 : 180;
            wasIncompleteRef.current = !nowComplete;
          } else if (wasIncompleteRef.current && nowComplete) {
            // Returned from profile setup after completing profile: smooth 3D Y-axis flip (~400ms)
            flipRotation.value = 180;
            flipRotation.value = withTiming(0, {
              duration: 400,
              easing: Easing.inOut(Easing.cubic),
            });
            wasIncompleteRef.current = false;
          } else {
            flipRotation.value = nowComplete ? 0 : 180;
            wasIncompleteRef.current = !nowComplete;
          }

          setProfile(fetchedProfile);
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
    }, [cardOpacity, flipRotation, startIdleLeftSwipeAnimation, translateX]),
  );

  // Swipe threshold (~120px or ~35% of screen width)
  const swipeThreshold = Math.min(120, Math.round(screenWidth * 0.35));

  const panGesture = Gesture.Pan()
    .enabled(!isLoading)
    .activeOffsetX([-10, 10])
    .onBegin(() => {
      "worklet";
      cancelAnimation(idleSwipeX);
      idleSwipeX.value = withTiming(0, { duration: 120 });
    })
    .onUpdate((event) => {
      "worklet";
      translateX.value = event.translationX;
      cardOpacity.value = interpolate(
        Math.abs(event.translationX),
        [0, swipeThreshold * 2.2],
        [1, 0.35],
        Extrapolation.CLAMP,
      );
    })
    .onEnd((event) => {
      "worklet";
      if (Math.abs(event.translationX) >= swipeThreshold) {
        const direction = event.translationX >= 0 ? 1 : -1;
        translateX.value = withTiming(direction * screenWidth * 1.15, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
        cardOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
          if (finished) {
            runOnJS(navigateFromCard)();
          }
        });
      } else {
        translateX.value = withSpring(0, {
          damping: 18,
          stiffness: 180,
          mass: 0.9,
        });
        cardOpacity.value = withSpring(1);
        runOnJS(startIdleLeftSwipeAnimation)();
      }
    });

  const cardDragAnimatedStyle = useAnimatedStyle(() => {
    const combinedX = translateX.value + idleSwipeX.value;
    const rotateZ = interpolate(
      combinedX,
      [-screenWidth * 0.75, 0, screenWidth * 0.75],
      [-15, 0, 15],
      Extrapolation.CLAMP,
    );
    return {
      opacity: cardOpacity.value,
      transform: [
        { translateX: combinedX },
        { rotateZ: `${rotateZ}deg` },
      ],
    };
  });

  const frontFaceAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      flipRotation.value,
      [0, 180],
      [0, 180],
      Extrapolation.CLAMP,
    );
    const faceOpacity = interpolate(
      flipRotation.value,
      [0, 89, 90, 180],
      [1, 1, 0, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity: faceOpacity,
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: "hidden" as const,
    };
  });

  const backFaceAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      flipRotation.value,
      [0, 180],
      [-180, 0],
      Extrapolation.CLAMP,
    );
    const faceOpacity = interpolate(
      flipRotation.value,
      [0, 89, 90, 180],
      [0, 0, 1, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: faceOpacity,
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: "hidden" as const,
    };
  });

  const hintAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, swipeThreshold * 0.7],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  const skeletonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: skeletonPulse.value,
  }));

  const displayName = formatDisplayName(profile?.name);
  const userInitial =
    displayName.charAt(0).toUpperCase() ||
    profile?.name?.trim()?.charAt(0)?.toUpperCase() ||
    "P";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.screenContainer}>
        {isLoading ? (
          /* Skeleton ID Card (shown while user data is being fetched) */
          <View
            accessibilityLabel="Loading workspace ID card"
            style={[
              styles.cardShell,
              styles.skeletonCard,
              {
                backgroundColor: colors.cardSurface,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Animated.View style={[styles.skeletonInner, skeletonAnimatedStyle]}>
              <View style={styles.brandRow}>
                <View
                  style={[
                    styles.skeletonPill,
                    { backgroundColor: colors.cardDivider },
                  ]}
                />
              </View>

              <View style={styles.identitySection}>
                <View
                  style={[
                    styles.avatarCircle,
                    {
                      backgroundColor: colors.cardAccentSoft,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonTitleBar,
                    { backgroundColor: colors.cardDivider },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonSubtitleBar,
                    { backgroundColor: colors.cardDivider },
                  ]}
                />
              </View>

              <View
                style={[
                  styles.cardDivider,
                  { backgroundColor: colors.cardDivider },
                ]}
              />

              <View style={styles.rowsContainer}>
                {[0, 1, 2].map((item) => (
                  <View key={item} style={styles.skeletonRow}>
                    <View
                      style={[
                        styles.skeletonRowLabel,
                        { backgroundColor: colors.cardDivider },
                      ]}
                    />
                    <View
                      style={[
                        styles.skeletonRowValue,
                        { backgroundColor: colors.cardDivider },
                      ]}
                    />
                  </View>
                ))}
              </View>
            </Animated.View>
          </View>
        ) : (
          <>
            <GestureDetector gesture={panGesture}>
              <Animated.View
                accessible
                accessibilityRole="button"
                accessibilityLabel={
                  complete
                    ? `Prospectra ID card for ${profile?.name}, ${profile?.role} at ${profile?.organizationName}. Swipe to open prospecting.`
                    : "Profile not set up. Swipe to complete your profile."
                }
                accessibilityActions={[{ name: "activate", label: complete ? "Open prospecting" : "Complete profile" }]}
                onAccessibilityAction={(event) => {
                  if (event.nativeEvent.actionName === "activate") {
                    navigateFromCard();
                  }
                }}
                style={[styles.cardWrapper, cardDragAnimatedStyle]}
              >
                {/* FRONT SIDE (shown when profile is complete) */}
                <Animated.View
                  pointerEvents={complete ? "auto" : "none"}
                  style={[
                    styles.cardShell,
                    {
                      backgroundColor: colors.cardSurface,
                      borderColor: colors.cardBorder,
                    },
                    frontFaceAnimatedStyle,
                  ]}
                >
                  {/* Subtle Top Glass Specular Sheen */}
                  <View
                    pointerEvents="none"
                    style={[
                      styles.glassSheenBar,
                      { backgroundColor: colors.cardDivider },
                    ]}
                  />

                  {/* App Brand Mark */}
                  <View style={styles.brandRow}>
                    <View
                      style={[
                        styles.brandDot,
                        { backgroundColor: colors.cardAccent },
                      ]}
                    />
                    <Text
                      style={[styles.brandMark, { color: colors.cardText }]}
                    >
                      PROSPECTRA
                    </Text>
                  </View>

                  {/* Avatar Circle + Full Name + Role */}
                  <View style={styles.identitySection}>
                    <View
                      style={[
                        styles.avatarCircle,
                        {
                          backgroundColor: colors.cardAccentSoft,
                          borderColor: colors.cardAccent,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.avatarInitial, { color: colors.cardAccent }]}
                      >
                        {userInitial}
                      </Text>
                    </View>

                    <Text
                      style={[styles.fullName, { color: colors.cardText }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {displayName}
                    </Text>

                    <Text
                      style={[styles.roleText, { color: colors.cardAccent }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {profile?.role}
                    </Text>
                  </View>

                  {/* Divider */}
                  <View
                    style={[
                      styles.cardDivider,
                      { backgroundColor: colors.cardDivider },
                    ]}
                  />

                  {/* Labeled Rows: ORGANIZATION, DOMAIN, EMAIL */}
                  <View style={styles.rowsContainer}>
                    <View style={styles.infoRow}>
                      <View style={styles.infoLabelWrap}>
                        <Building2
                          size={14}
                          color={colors.cardMuted}
                          strokeWidth={1.75}
                        />
                        <Text
                          style={[styles.infoLabel, { color: colors.cardMuted }]}
                        >
                          ORGANIZATION
                        </Text>
                      </View>
                      <Text
                        style={[styles.infoValue, { color: colors.cardText }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {profile?.organizationName}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <View style={styles.infoLabelWrap}>
                        <Globe
                          size={14}
                          color={colors.cardMuted}
                          strokeWidth={1.75}
                        />
                        <Text
                          style={[styles.infoLabel, { color: colors.cardMuted }]}
                        >
                          DOMAIN
                        </Text>
                      </View>
                      <Text
                        style={[styles.infoValue, { color: colors.cardText }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {profile?.organizationDomain}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <View style={styles.infoLabelWrap}>
                        <Mail
                          size={14}
                          color={colors.cardMuted}
                          strokeWidth={1.75}
                        />
                        <Text
                          style={[styles.infoLabel, { color: colors.cardMuted }]}
                        >
                          EMAIL
                        </Text>
                      </View>
                      <Text
                        style={[styles.infoValue, { color: colors.cardText }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {profile?.email}
                      </Text>
                    </View>
                  </View>
                </Animated.View>

                {/* BACK SIDE (shown when profile is NOT complete) */}
                <Animated.View
                  pointerEvents={!complete ? "auto" : "none"}
                  style={[
                    styles.cardShell,
                    styles.backCardShell,
                    {
                      backgroundColor: colors.cardSurface,
                      borderColor: colors.cardBorder,
                    },
                    backFaceAnimatedStyle,
                  ]}
                >
                  {/* Subtle Top Glass Specular Sheen */}
                  <View
                    pointerEvents="none"
                    style={[
                      styles.glassSheenBar,
                      { backgroundColor: colors.cardDivider },
                    ]}
                  />

                  <View style={styles.brandRow}>
                    <View
                      style={[
                        styles.brandDot,
                        { backgroundColor: colors.cardAccent },
                      ]}
                    />
                    <Text
                      style={[styles.brandMark, { color: colors.cardText }]}
                    >
                      PROSPECTRA
                    </Text>
                  </View>

                  <View style={styles.backCenterContent}>
                    <View
                      style={[
                        styles.backIconBadge,
                        {
                          backgroundColor: colors.cardAccentSoft,
                          borderColor: colors.cardBorder,
                        },
                      ]}
                    >
                      <ShieldAlert
                        size={28}
                        color={colors.cardAccent}
                        strokeWidth={1.75}
                      />
                    </View>

                    <Text
                      style={[styles.backTitle, { color: colors.cardText }]}
                    >
                      Profile not set up
                    </Text>

                    <Text
                      style={[
                        styles.backDescription,
                        { color: colors.cardMuted },
                      ]}
                    >
                      Please add your name, organization, domain, and role to
                      activate your workspace ID card.
                    </Text>
                  </View>
                </Animated.View>
              </Animated.View>
            </GestureDetector>

            {/* Swipe Hint Text (fades out as user drags) */}
            <Animated.View style={[styles.hintWrap, hintAnimatedStyle]}>
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                {complete
                  ? "Swipe to prospect ›››"
                  : "Swipe to complete profile ›››"}
              </Text>
            </Animated.View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const CARD_MIN_HEIGHT = 400;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.lg,
    gap: tokens.spacing.lg,
  },
  cardWrapper: {
    width: "100%",
    minHeight: CARD_MIN_HEIGHT,
    position: "relative",
  },
  cardShell: {
    width: "100%",
    minHeight: CARD_MIN_HEIGHT,
    borderRadius: tokens.radius.card,
    borderWidth: 1.5,
    padding: tokens.spacing.lg + 4,
    justifyContent: "space-between",
    overflow: "hidden",
    ...tokens.shadow.lg,
  },
  glassSheenBar: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    borderRadius: tokens.radius.full,
  },
  backCardShell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.sm,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: tokens.radius.full,
  },
  brandMark: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xs,
    letterSpacing: 2.4,
    lineHeight: 16,
  },
  identitySection: {
    alignItems: "center",
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.xs + 2,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: tokens.radius.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.spacing.xs,
  },
  avatarInitial: {
    fontFamily: "DMSansBold",
    fontSize: 28,
    lineHeight: 34,
  },
  fullName: {
    maxWidth: "100%",
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xl,
    lineHeight: 30,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  roleText: {
    maxWidth: "100%",
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
    textAlign: "center",
  },
  cardDivider: {
    height: 1,
    width: "100%",
    marginVertical: tokens.spacing.xs,
  },
  rowsContainer: {
    gap: tokens.spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.md,
  },
  infoLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    flexShrink: 0,
  },
  infoLabel: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    letterSpacing: 1,
    lineHeight: 16,
  },
  infoValue: {
    flex: 1,
    textAlign: "right",
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  backCenterContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  backIconBadge: {
    width: 64,
    height: 64,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.spacing.xs,
  },
  backTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xl,
    lineHeight: 30,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  backDescription: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 22,
    textAlign: "center",
  },
  hintWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  hintText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    letterSpacing: 0.4,
    lineHeight: 20,
  },
  skeletonCard: {
    justifyContent: "center",
  },
  skeletonInner: {
    flex: 1,
    justifyContent: "space-between",
  },
  skeletonPill: {
    width: 110,
    height: 14,
    borderRadius: tokens.radius.full,
  },
  skeletonTitleBar: {
    width: 180,
    height: 22,
    borderRadius: tokens.radius.sm,
    marginTop: tokens.spacing.xs,
  },
  skeletonSubtitleBar: {
    width: 130,
    height: 16,
    borderRadius: tokens.radius.sm,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.md,
  },
  skeletonRowLabel: {
    width: 96,
    height: 14,
    borderRadius: tokens.radius.sm,
  },
  skeletonRowValue: {
    width: 140,
    height: 16,
    borderRadius: tokens.radius.sm,
  },
});
