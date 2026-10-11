import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from "expo-router";
import * as NativeSplashScreen from "expo-splash-screen";
import { useCallback, useState } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";

import SplashScreen from "./splashScreen/splashScreen";

NativeSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({});
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
