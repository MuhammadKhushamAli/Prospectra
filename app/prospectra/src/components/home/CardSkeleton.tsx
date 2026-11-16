import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { tokens } from "../../constants/theme";

interface CardSkeletonProps {
  colors: any;
  animatedStyle: any;
}

export function CardSkeleton({ colors, animatedStyle }: CardSkeletonProps) {
  return (
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
      <Animated.View style={[styles.skeletonInner, animatedStyle]}>
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
  skeletonCard: {
    justifyContent: "center",
  },
  skeletonInner: {
    flex: 1,
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonPill: {
    width: 110,
    height: 14,
    borderRadius: tokens.radius.full,
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
  cardDivider: {
    height: 1,
    width: "100%",
    marginVertical: tokens.spacing.xs,
  },
  rowsContainer: {
    gap: tokens.spacing.md,
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
