import { useEffect } from "react";
import { Image, StyleSheet, useColorScheme, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { theme, tokens } from "@/constants/theme";

const BRAND = "Prospectra".split("");
const LOGO_DURATION = 700;
const LETTER_START_DELAY = 500;
const LETTER_STAGGER = 70;
const LETTER_DURATION = 260;
const HOLD_DURATION = 400;
const FADE_DURATION = 300;

type LetterProps = {
  character: string;
  color: string;
  distance: number;
  index: number;
  reducedMotion: boolean;
};

function BrandLetter({ character, color, distance, index, reducedMotion }: LetterProps) {
  const translateY = useSharedValue(reducedMotion ? 0 : distance);
  const opacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      translateY.value = 0;
      opacity.value = 1;
      return;
    }

    const delay = LETTER_START_DELAY + index * LETTER_STAGGER;
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: LETTER_DURATION, easing: Easing.out(Easing.cubic) }),
    );
    opacity.value = withDelay(delay, withTiming(1, { duration: LETTER_DURATION }));
  }, [distance, index, opacity, reducedMotion, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.Text style={[styles.letter, { color }, animatedStyle]}>{character}</Animated.Text>;
}

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const colorScheme = useColorScheme();
  const colors = theme[colorScheme === "dark" ? "dark" : "light"];
  const { height, width } = useWindowDimensions();
  const reducedMotion = Boolean(useReducedMotion());
  const logoSize = Math.min(width * 0.36, height * 0.18);
  const letterDistance = Math.max(tokens.spacing.xl + tokens.spacing.lg, height * 0.07);
  const groupOffset = (tokens.fontSize.xl + tokens.spacing.md) / 2;
  const logoY = useSharedValue(reducedMotion ? 0 : -height);
  const logoOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    const fadeDelay = reducedMotion
      ? HOLD_DURATION
      : LETTER_START_DELAY + (BRAND.length - 1) * LETTER_STAGGER + LETTER_DURATION + HOLD_DURATION;

    if (!reducedMotion) {
      logoY.value = withTiming(0, {
        duration: LOGO_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      logoOpacity.value = withTiming(1, { duration: LOGO_DURATION / 2 });
    }

    screenOpacity.value = withDelay(
      fadeDelay,
      withTiming(0, { duration: FADE_DURATION }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      }),
    );
  }, [logoOpacity, logoY, onFinish, reducedMotion, screenOpacity]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));

  return (
    <Animated.View style={[styles.screen, { backgroundColor: colors.background }, screenStyle]}>
      <View style={[styles.content, { transform: [{ translateY: -groupOffset }] }]}>
        <Animated.View style={logoStyle}>
          <Image source={colors.icon} style={{ height: logoSize, width: logoSize }} />
        </Animated.View>
        <View style={{ height: tokens.spacing.md }} />
        <View style={styles.word}>
          {BRAND.map((character, index) => (
            <BrandLetter
              character={character}
              color={colors.text}
              distance={letterDistance}
              index={index}
              key={`${character}-${index}`}
              reducedMotion={reducedMotion}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
  },
  word: {
    flexDirection: "row",
  },
  letter: {
    fontFamily: "serif",
    fontSize: tokens.fontSize.xl,
    letterSpacing: tokens.spacing.xs,
  },
});
