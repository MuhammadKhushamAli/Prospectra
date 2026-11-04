import { useFonts } from "expo-font";
import { Fraunces_600SemiBold, Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from "expo-router";
import * as NativeSplashScreen from "expo-splash-screen";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { theme } from "../constants/theme";
import SplashScreen from "./splashScreen/splashScreen";

NativeSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Fraunces: Fraunces_600SemiBold,
    FrauncesBold: Fraunces_700Bold,
    DMSans: DMSans_400Regular,
    DMSansMedium: DMSans_500Medium,
    DMSansSemiBold: DMSans_600SemiBold,
    DMSansBold: DMSans_700Bold,
  });
  const [showSplash, setShowSplash] = useState(true);

  const hideNativeSplash = useCallback(() => {
    void NativeSplashScreen.hideAsync();
  }, []);

  const palette = colorScheme === "dark" ? theme.dark : theme.light;

  const navigationTheme = useMemo(() => {
    const isDark = colorScheme === "dark";
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: palette.primary,
        background: palette.background,
        card: palette.surface,
        text: palette.text,
        border: palette.border,
        notification: palette.primary,
      },
    };
  }, [colorScheme, palette]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <GestureHandlerRootView
        onLayout={hideNativeSplash}
        style={[styles.root, { backgroundColor: palette.background }]}
      >
        {/* Subtle ambient glass backdrop glows */}
        <View pointerEvents="none" style={styles.ambientLayer}>
          <View
            style={[
              styles.ambientOrbTop,
              { backgroundColor: palette.primarySoft },
            ]}
          />
          <View
            style={[
              styles.ambientOrbBottom,
              { backgroundColor: palette.secondarySoft },
            ]}
          />
        </View>
        <Slot />
        {showSplash ? <SplashScreen onFinish={() => setShowSplash(false)} /> : null}
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  ambientLayer: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  ambientOrbTop: {
    position: "absolute",
    top: -90,
    right: -70,
    width: 280,
    height: 280,
    borderRadius: 999,
    opacity: 0.65,
  },
  ambientOrbBottom: {
    position: "absolute",
    bottom: -110,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 999,
    opacity: 0.55,
  },
});
