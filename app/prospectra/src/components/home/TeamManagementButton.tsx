import { Pressable, StyleSheet, Text } from "react-native";
import { ChevronRight, Users } from "lucide-react-native";

import { tokens } from "../../constants/theme";

interface TeamManagementButtonProps {
  onPress: () => void;
  colors: any;
}

export function TeamManagementButton({ onPress, colors }: TeamManagementButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.adminNavBtn,
        {
          backgroundColor: colors.surfaceElevated || colors.surface,
          borderColor: colors.border,
        },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityLabel="Open Admin and Team Management"
    >
      <Users size={16} color={colors.text} />
      <Text style={[styles.adminNavBtnText, { color: colors.text }]}>
        Team Management
      </Text>
      <ChevronRight size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  adminNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    gap: 8,
    marginTop: tokens.spacing.xs,
  },
  adminNavBtnText: {
    flex: 1,
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
  },
});
