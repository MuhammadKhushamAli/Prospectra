import { StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import { authCopy } from "../../constants/constants";
import { useTheme } from "../../hooks/useTheme";

export default function Divider() {
  const colors = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
      <Text
        style={[
          styles.text,
          { color: colors.textSecondary, backgroundColor: colors.background },
        ]}
      >
        {authCopy.divider}
      </Text>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    marginVertical: tokens.spacing.lg,
  },
  line: { flex: 1, height: 1 },
  text: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    paddingHorizontal: tokens.spacing.sm,
  },
});
