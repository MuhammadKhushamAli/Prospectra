import { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Gesture } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { getSupabaseClient } from "../../config/supabaseClient";
import { TABLES } from "../../constants/tables";
import { checkUserOnboardingStatus } from "../../services/onboardingService";
import { formatDisplayName, isProfileComplete } from "../../services/profileService";
import { fetchUserIdCardProfile } from "../../helpers/home/homeCardHelpers";
import type { UserIdCardProfile } from "../../types/profile";
import { CardSkeleton } from "./CardSkeleton";
import { UserIdCard } from "./UserIdCard";
import { TeamManagementButton } from "./TeamManagementButton";

export default function HomeScreen() {
  const colors = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const [profile, setProfile] = useState<UserIdCardProfile | null>(null);
  const [isFounder, setIsFounder] = useState(false);
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

          const { data: memberData } = await supabase
            .from(TABLES.ORGANIZATION_MEMBERS)
            .select("role")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          setIsFounder(memberData?.role === "founder");

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
            scheduleOnRN(navigateFromCard);
          }
        });
      } else {
        translateX.value = withSpring(0, {
          damping: 18,
          stiffness: 180,
          mass: 0.9,
        });
        cardOpacity.value = withSpring(1);
        scheduleOnRN(startIdleLeftSwipeAnimation);
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
          <CardSkeleton
            colors={colors}
            animatedStyle={skeletonAnimatedStyle}
          />
        ) : (
          <>
            <UserIdCard
              profile={profile}
              displayName={displayName}
              userInitial={userInitial}
              complete={complete}
              panGesture={panGesture}
              cardDragAnimatedStyle={cardDragAnimatedStyle}
              frontFaceAnimatedStyle={frontFaceAnimatedStyle}
              backFaceAnimatedStyle={backFaceAnimatedStyle}
              onNavigate={navigateFromCard}
              colors={colors}
            />

            {/* Swipe Hint Text (fades out as user drags) */}
            <Animated.View style={[styles.hintWrap, hintAnimatedStyle]}>
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                {complete
                  ? "Swipe to prospect ›››"
                  : "Swipe to complete profile ›››"}
              </Text>
            </Animated.View>

            {isFounder && (
              <TeamManagementButton
                onPress={() => router.push("/admin" as any)}
                colors={colors}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

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
});
