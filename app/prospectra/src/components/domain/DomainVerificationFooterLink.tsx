import { StyleSheet, Text } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { domainVerificationCopy } from "../../constants/constants";

interface DomainVerificationFooterLinkProps {
  onPress?: () => void;
}

export default function DomainVerificationFooterLink({
  onPress,
}: DomainVerificationFooterLinkProps) {
  const colors = useTheme();
  return (
    <Text
      onPress={onPress}
      style={[styles.text, { color: colors.textSecondary }]}
    >
      <Text style={{ color: colors.primary, fontFamily: "DMSansSemiBold" }}>
        {domainVerificationCopy.actions.backToLogin}
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
