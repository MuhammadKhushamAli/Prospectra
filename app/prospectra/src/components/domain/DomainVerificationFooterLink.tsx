import { Pressable, StyleSheet, Text } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { domainVerificationCopy } from "../../constants/constants";
import type { DomainVerificationFooterLinkProps } from "../../types/domain";

export type { DomainVerificationFooterLinkProps };

export default function DomainVerificationFooterLink({
  onPress,
}: DomainVerificationFooterLinkProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {domainVerificationCopy.actions.backToLogin}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    marginTop: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  text: {
    textAlign: "center",
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
});
