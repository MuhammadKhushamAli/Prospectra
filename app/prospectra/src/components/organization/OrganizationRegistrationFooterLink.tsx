import { Pressable, StyleSheet, Text } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { organizationRegistrationCopy } from "../../constants/constants";
import type { OrganizationRegistrationFooterLinkProps } from "../../types/organization";

export type { OrganizationRegistrationFooterLinkProps };

export default function OrganizationRegistrationFooterLink({
  onPress,
}: OrganizationRegistrationFooterLinkProps) {
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
        {organizationRegistrationCopy.actions.backToLogin}
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
