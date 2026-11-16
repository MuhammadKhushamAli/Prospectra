import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { ShieldAlert } from "lucide-react-native";

import { tokens } from "../../constants/theme";

interface CardBackProps {
  colors: any;
  animatedStyle: any;
  pointerEvents?: "auto" | "none";
}

export function CardBack({
  colors,
  animatedStyle,
  pointerEvents = "auto",
}: CardBackProps) {
  return (
    <Animated.View
      pointerEvents={pointerEvents}
      style={[
        styles.cardShell,
        styles.backCardShell,
        {
          backgroundColor: colors.cardSurface,
          borderColor: colors.cardBorder,
        },
        animatedStyle,
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
        <Text style={[styles.brandMark, { color: colors.cardText }]}>
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

        <Text style={[styles.backTitle, { color: colors.cardText }]}>
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
  );
}

const CARD_MIN_HEIGHT = 400;

const styles = StyleSheet.create({
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
  backCardShell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glassSheenBar: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    borderRadius: tokens.radius.full,
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
});
