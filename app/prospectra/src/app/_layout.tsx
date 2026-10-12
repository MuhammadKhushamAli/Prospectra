import { useFonts } from "expo-font";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from "@expo-google-fonts/dm-sans";
import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from "expo-router";
import * as NativeSplashScreen from "expo-splash-screen";
import { useCallback, useState } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";

import SplashScreen from "./splashScreen/splashScreen";

NativeSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Fraunces: Fraunces_600SemiBold,
    DMSans: DMSans_400Regular,
    DMSansMedium: DMSans_500Medium,
    DMSansSemiBold: DMSans_600SemiBold,
  });
  const [showSplash, setShowSplash] = useState(true);

  const hideNativeSplash = useCallback(() => {
    void NativeSplashScreen.hideAsync();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <View onLayout={hideNativeSplash} style={styles.root}>
        <Slot />
        {showSplash ? <SplashScreen onFinish={() => setShowSplash(false)} /> : null}
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
