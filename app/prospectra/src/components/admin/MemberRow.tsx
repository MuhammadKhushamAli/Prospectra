import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import {
  ArrowDown,
  ArrowUp,
  Crown,
  Eye,
  Shield,
  Trash2,
  User,
} from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import type { ActorContext, OrgMember, OrgRole } from "@/types/admin";

interface MemberRowProps {
  member: OrgMember;
  actor: ActorContext | null;
  isCurrentActor: boolean;
  isActionLoading: boolean;
  onChangeRole: (userId: string, newRole: OrgRole) => Promise<any>;
  onRemoveMember: (userId: string) => Promise<any>;
  onViewActivity: (member: OrgMember) => void;
}

export const MemberRow: React.FC<MemberRowProps> = ({
  member,
  actor,
  isCurrentActor,
  isActionLoading,
  onChangeRole,
  onRemoveMember,
  onViewActivity,
}) => {
  const colors = useTheme();
  const isDark = useColorScheme() === "dark";

  const displayName = member.full_name || member.email?.split("@")[0] || "Teammate";
  const initials = (member.full_name || member.email || "T")
    .split(" ")
    .map((w: string) => w[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const canViewData = member.allowed_actions?.includes("view_data");
  const canPromote = member.allowed_actions?.includes("promote_to_founder");
  const canDemote = member.allowed_actions?.includes("demote_to_member");
  const canRemove = member.allowed_actions?.includes("remove");

  const handlePromote = () => {
    const isOwnerActor = actor?.is_owner;
    const message = isOwnerActor
      ? `Are you sure you want to promote ${displayName} to Founder? They will gain administrative access.`
      : `Promoting ${displayName} to Founder requires approval from the organization owner. Would you like to submit this request?`;

    Alert.alert("Promote to Founder", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: isOwnerActor ? "Promote" : "Submit Request",
        onPress: () => onChangeRole(member.user_id, "founder"),
      },
    ]);
  };

  const handleDemote = () => {
    Alert.alert(
      "Demote to Member",
      `Are you sure you want to change ${displayName}'s role to Member?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Demote",
          style: "destructive",
          onPress: () => onChangeRole(member.user_id, "member"),
        },
      ],
    );
  };

  const handleRemove = () => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${displayName} from the organization? They will lose access to team resources immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onRemoveMember(member.user_id),
        },
      ],
    );
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.avatarContainer}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: member.is_owner
                  ? "rgba(224, 138, 82, 0.2)"
                  : isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
                borderColor: member.is_owner ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                { color: member.is_owner ? colors.primary : colors.text },
              ]}
            >
              {initials}
            </Text>
          </View>
        </View>

        <View style={styles.infoCol}>
          <View style={styles.nameBadgeRow}>
            <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            {isCurrentActor && (
              <View
                style={[
                  styles.youBadge,
                  { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" },
                ]}
              >
                <Text style={[styles.youText, { color: colors.textSecondary }]}>You</Text>
              </View>
            )}
          </View>

          <Text style={[styles.emailText, { color: colors.textSecondary }]} numberOfLines={1}>
            {member.email || "No email available"}
          </Text>
        </View>

        <View style={styles.badgeCol}>
          {member.is_owner ? (
            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor: "rgba(224, 138, 82, 0.15)",
                  borderColor: colors.primary,
                },
              ]}
            >
              <Crown size={12} color={colors.primary} />
              <Text style={[styles.roleText, { color: colors.primary }]}>Owner</Text>
            </View>
          ) : member.role === "founder" ? (
            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                  borderColor: colors.border,
                },
              ]}
            >
              <Shield size={12} color={colors.text} />
              <Text style={[styles.roleText, { color: colors.text }]}>Founder</Text>
            </View>
          ) : (
            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor: "rgba(0,0,0,0.03)",
                  borderColor: colors.border,
                },
              ]}
            >
              <User size={12} color={colors.textSecondary} />
              <Text style={[styles.roleText, { color: colors.textSecondary }]}>Member</Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Toolbar */}
      <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Joined {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : "Recently"}
          </Text>
        </View>

        <View style={styles.buttonsRow}>
          {isActionLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              {canViewData && (
                <Pressable
                  onPress={() => onViewActivity(member)}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityLabel="View teammate activity"
                >
                  <Eye size={14} color={colors.text} />
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Activity</Text>
                </Pressable>
              )}

              {canPromote && (
                <Pressable
                  onPress={handlePromote}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    {
                      borderColor: colors.primary,
                      backgroundColor: "rgba(224, 138, 82, 0.08)",
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <ArrowUp size={14} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                    Make Founder
                  </Text>
                </Pressable>
              )}

              {canDemote && (
                <Pressable
                  onPress={handleDemote}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <ArrowDown size={14} color={colors.textSecondary} />
                  <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>
                    Make Member
                  </Text>
                </Pressable>
              )}

              {canRemove && (
                <Pressable
                  onPress={handleRemove}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.dangerBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityLabel="Remove member"
                >
                  <Trash2 size={14} color="#EF4444" />
                  <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Remove</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  infoCol: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nameText: {
    fontSize: 15,
    fontWeight: "600",
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  youText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  emailText: {
    fontSize: 13,
    marginTop: 2,
  },
  badgeCol: {
    marginLeft: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  metaRow: {
    flex: 1,
  },
  metaText: {
    fontSize: 11,
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  dangerBtn: {
    borderColor: "rgba(239, 68, 68, 0.4)",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
