import { Image, StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { appName, profileSetupCopy } from "../../constants/constants";

interface ProfileSetupHeaderProps {
  userName?: string;
}

export default function ProfileSetupHeader({ userName }: ProfileSetupHeaderProps) {
  const colors = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Image source={colors.icon} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.brandName, { color: colors.text }]}>
          {appName}
        </Text>
      </View>
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: colors.text }]}>
          {profileSetupCopy.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {userName ? `Welcome, ${userName}! ` : ""}
          {profileSetupCopy.subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: tokens.spacing.lg },
  brand: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm },
  logo: { width: 40, height: 40 },
  brandName: { fontFamily: "DMSansSemiBold", fontSize: tokens.fontSize.md },
  titleBlock: { marginTop: tokens.spacing.auth },
  title: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.authTitle,
    lineHeight: tokens.fontSize.xl,
  },
  subtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.authSubtitle,
    lineHeight: tokens.fontSize.lg,
    marginTop: tokens.spacing.sm,
  },
});
