import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, Building2, Globe, ShieldCheck } from "lucide-react-native";

import { tokens } from "../../constants/theme";

interface ProspectingHeaderProps {
  onBack: () => void;
  orgName?: string | null;
  orgDomain?: string | null;
  colors: any;
}

export function ProspectingHeader({
  onBack,
  orgName,
  orgDomain,
  colors,
}: ProspectingHeaderProps) {
  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        hitSlop={8}
        style={({ pressed }) => [
          styles.backButton,
          {
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <ArrowLeft size={18} color={colors.text} strokeWidth={2} />
      </Pressable>

      <View style={styles.headerInfo}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Prospecting
        </Text>
        <View style={styles.headerOrgRow}>
          {orgName ? (
            <View style={styles.orgBadgeWrap}>
              <Building2
                size={11}
                color={colors.primary}
                strokeWidth={1.75}
              />
              <Text
                style={[styles.headerSubtitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {orgName}
              </Text>
            </View>
          ) : null}
          {orgDomain ? (
            <View
              style={[
                styles.domainVerifiedPill,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <ShieldCheck
                size={11}
                color={colors.success}
                strokeWidth={1.75}
              />
              <Text
                style={[
                  styles.domainVerifiedText,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {orgDomain}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm + 2,
    borderBottomWidth: 1,
    gap: tokens.spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.lg,
    lineHeight: 24,
  },
  headerOrgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    flexWrap: "wrap",
  },
  orgBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerSubtitle: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  domainVerifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  domainVerifiedText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs - 1,
    lineHeight: 14,
  },
});
