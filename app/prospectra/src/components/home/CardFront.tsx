import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Building2, Globe, Mail } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import type { UserIdCardProfile } from "../../types/profile";

interface CardFrontProps {
  profile: UserIdCardProfile | null;
  displayName: string;
  userInitial: string;
  colors: any;
  animatedStyle: any;
  pointerEvents?: "auto" | "none";
}

export function CardFront({
  profile,
  displayName,
  userInitial,
  colors,
  animatedStyle,
  pointerEvents = "auto",
}: CardFrontProps) {
  return (
    <Animated.View
      pointerEvents={pointerEvents}
      style={[
        styles.cardShell,
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

      {/* App Brand Mark */}
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
          <Text style={[styles.avatarInitial, { color: colors.cardAccent }]}>
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
            <Text style={[styles.infoLabel, { color: colors.cardMuted }]}>
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
            <Text style={[styles.infoLabel, { color: colors.cardMuted }]}>
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
            <Text style={[styles.infoLabel, { color: colors.cardMuted }]}>
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
});
