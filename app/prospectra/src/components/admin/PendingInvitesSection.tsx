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
import { Clock, Mail, X } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import type { OrgInvite } from "@/types/admin";

interface PendingInvitesSectionProps {
  invites: OrgInvite[];
  actionInProgress: string | null;
  onRevokeInvite: (inviteId: string) => Promise<any>;
}

export const PendingInvitesSection: React.FC<PendingInvitesSectionProps> = ({
  invites,
  actionInProgress,
  onRevokeInvite,
}) => {
  const colors = useTheme();
  const isDark = useColorScheme() === "dark";

  if (invites.length === 0) {
    return null;
  }

  const handleRevoke = (invite: OrgInvite) => {
    Alert.alert(
      "Revoke Invitation",
      `Are you sure you want to revoke the invitation for ${invite.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: () => onRevokeInvite(invite.id),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Clock size={16} color={colors.textSecondary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Pending Invitations ({invites.length})
        </Text>
      </View>

      {invites.map((invite) => {
        const isRevoking = actionInProgress === `revoke-${invite.id}`;
        const dateStr = invite.created_at
          ? new Date(invite.created_at).toLocaleDateString()
          : "";
        return (
          <View
            key={invite.id}
            style={[
              styles.inviteCard,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.02)" : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.leftCol}>
              <View
                style={[
                  styles.mailIconCircle,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                <Mail size={16} color={colors.text} />
              </View>
              <View style={styles.emailCol}>
                <Text style={[styles.emailText, { color: colors.text }]}>
                  {invite.email}
                </Text>
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  Invited {dateStr}
                </Text>
              </View>
            </View>

            <View style={styles.rightCol}>
              <View
                style={[
                  styles.pendingBadge,
                  {
                    backgroundColor: "rgba(217, 119, 6, 0.12)",
                    borderColor: "rgba(217, 119, 6, 0.3)",
                  },
                ]}
              >
                <Text style={styles.pendingBadgeText}>Pending</Text>
              </View>

              <Pressable
                onPress={() => handleRevoke(invite)}
                disabled={isRevoking}
                style={({ pressed }) => [
                  styles.revokeBtn,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityLabel="Revoke invite"
              >
                {isRevoking ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <X size={14} color="#EF4444" />
                    <Text style={styles.revokeBtnText}>Revoke</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  leftCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  mailIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  emailCol: {
    flex: 1,
  },
  emailText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 11,
    marginTop: 2,
  },
  rightCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  pendingBadgeText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "600",
  },
  revokeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  revokeBtnText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "600",
  },
});
