import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { ArrowLeft, Crown, RefreshCw, Shield, UserPlus } from "lucide-react-native";
import { router } from "expo-router";

import { useTheme } from "@/hooks/useTheme";
import type { ActorContext } from "@/types/admin";

interface AdminHeaderProps {
  actor: ActorContext | null;
  onRefresh: () => void;
  onOpenInvite: () => void;
  isRefreshing?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  actor,
  onRefresh,
  onOpenInvite,
  isRefreshing = false,
}) => {
  const colors = useTheme();
  const isDark = useColorScheme() === "dark";

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={18} color={colors.text} />
          </Pressable>

          <View style={styles.titleBadgeCol}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              Team Management
            </Text>
            {actor?.is_owner ? (
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: "rgba(224, 138, 82, 0.15)", borderColor: colors.primary },
                ]}
              >
                <Crown size={10} color={colors.primary} />
                <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                  Owner
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <Shield size={10} color={colors.textSecondary} />
                <Text style={[styles.roleBadgeText, { color: colors.textSecondary }]}>
                  Founder
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.rightGroup}>
          <Pressable
            onPress={onRefresh}
            disabled={isRefreshing}
            hitSlop={6}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="Refresh team data"
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <RefreshCw size={16} color={colors.text} />
            )}
          </Pressable>

          <Pressable
            onPress={onOpenInvite}
            hitSlop={6}
            style={({ pressed }) => [
              styles.inviteButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityLabel="Invite teammate"
          >
            <UserPlus size={14} color="#FFFFFF" />
            <Text style={styles.inviteButtonText}>Invite</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBadgeCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  roleBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  inviteButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
