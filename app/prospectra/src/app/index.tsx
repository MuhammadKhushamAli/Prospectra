import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { useTheme } from "../hooks/useTheme";
import { checkUserOnboardingStatus } from "../services/onboardingService";

export default function IndexRoute() {
  const colors = useTheme();

  useEffect(() => {
    let isMounted = true;

    async function evaluateInitialRoute() {
      try {
        const status = await checkUserOnboardingStatus();
        if (isMounted) {
          router.replace(status.targetRoute);
        }
      } catch {
        if (isMounted) {
          router.replace("/auth");
        }
      }
    }

    evaluateInitialRoute();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
