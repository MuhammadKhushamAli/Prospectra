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
import { Check, ShieldAlert, X } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import type { OrgApproval } from "@/types/admin";

interface ApprovalsSectionProps {
  approvals: OrgApproval[];
  actionInProgress: string | null;
  onDecideApproval: (approvalId: string, decision: "approve" | "reject") => Promise<any>;
}

export const ApprovalsSection: React.FC<ApprovalsSectionProps> = ({
  approvals,
  actionInProgress,
  onDecideApproval,
}) => {
  const colors = useTheme();
  const isDark = useColorScheme() === "dark";

  if (approvals.length === 0) {
    return (
      <View
        style={[
          styles.emptyBox,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.02)" : colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <ShieldAlert size={20} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No pending approvals. When a founder requests to promote a member, it will appear here.
        </Text>
      </View>
    );
  }

  const handleApprove = (approval: OrgApproval) => {
    const target = approval.target_name || approval.target_email || "the member";
    Alert.alert(
      "Approve Founder Promotion",
      `Are you sure you want to approve promoting ${target} to Founder? They will have full administrative access.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () => onDecideApproval(approval.id, "approve"),
        },
      ],
    );
  };

  const handleReject = (approval: OrgApproval) => {
    const target = approval.target_name || approval.target_email || "the member";
    Alert.alert(
      "Reject Promotion",
      `Are you sure you want to reject the founder promotion for ${target}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => onDecideApproval(approval.id, "reject"),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <ShieldAlert size={16} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Pending Approvals ({approvals.length})
        </Text>
      </View>

      {approvals.map((approval) => {
        const isActing = actionInProgress === `approval-${approval.id}`;
        const targetName = approval.target_name || approval.target_email || "Member";
        const requesterDesc = approval.requested_by
          ? `Founder ID: ${approval.requested_by.slice(0, 8)}`
          : "Founder";

        return (
          <View
            key={approval.id}
            style={[
              styles.approvalCard,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : colors.surface,
                borderColor: colors.primary,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor: "rgba(224, 138, 82, 0.15)",
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
                    Role Promotion
                  </Text>
                </View>
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                  {approval.created_at ? new Date(approval.created_at).toLocaleDateString() : ""}
                </Text>
              </View>
            </View>

            <View style={styles.contentCol}>
              <Text style={[styles.headlineText, { color: colors.text }]}>
                Promote <Text style={{ fontWeight: "700" }}>{targetName}</Text> to Founder
              </Text>
              <Text style={[styles.requesterText, { color: colors.textSecondary }]}>
                Requested by {requesterDesc}
              </Text>
            </View>

            <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
              {isActing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <View style={styles.buttonsGroup}>
                  <Pressable
                    onPress={() => handleReject(approval)}
                    style={({ pressed }) => [
                      styles.rejectBtn,
                      { borderColor: colors.border },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <X size={14} color="#EF4444" />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleApprove(approval)}
                    style={({ pressed }) => [
                      styles.approveBtn,
                      { backgroundColor: colors.primary },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Check size={14} color="#FFFFFF" />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
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
  emptyBox: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  approvalCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  timeText: {
    fontSize: 11,
  },
  contentCol: {
    marginVertical: 10,
  },
  headlineText: {
    fontSize: 15,
    lineHeight: 20,
  },
  requesterText: {
    fontSize: 12,
    marginTop: 4,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 10,
    borderTopWidth: 1,
  },
  buttonsGroup: {
    flexDirection: "row",
    gap: 8,
  },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectBtnText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approveBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
