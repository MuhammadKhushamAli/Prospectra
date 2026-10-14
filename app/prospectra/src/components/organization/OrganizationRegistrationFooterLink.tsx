import { StyleSheet, Text } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { organizationRegistrationCopy } from "../../constants/constants";

interface OrganizationRegistrationFooterLinkProps {
  onPress?: () => void;
}

export default function OrganizationRegistrationFooterLink({
  onPress,
}: OrganizationRegistrationFooterLinkProps) {
  const colors = useTheme();
  return (
    <Text
      onPress={onPress}
      style={[styles.text, { color: colors.textSecondary }]}
    >
      <Text style={{ color: colors.primary, fontFamily: "DMSansSemiBold" }}>
        {organizationRegistrationCopy.actions.backToLogin}
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: "center",
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    marginTop: tokens.spacing.lg,
  },
});
