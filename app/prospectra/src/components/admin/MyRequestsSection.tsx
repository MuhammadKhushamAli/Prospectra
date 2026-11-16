import React from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { Clock, ShieldCheck } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import type { OrgApproval } from "@/types/admin";

interface MyRequestsSectionProps {
  requests: OrgApproval[];
}

export const MyRequestsSection: React.FC<MyRequestsSectionProps> = ({ requests }) => {
  const colors = useTheme();
  const isDark = useColorScheme() === "dark";

  if (requests.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Clock size={16} color={colors.textSecondary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Submitted Role Requests ({requests.length})
        </Text>
      </View>

      {requests.map((req) => {
        const targetName = req.target_name || req.target_email || "Member";
        const dateStr = req.created_at ? new Date(req.created_at).toLocaleDateString() : "";
        return (
          <View
            key={req.id}
            style={[
              styles.requestCard,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.02)" : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.leftCol}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                <ShieldCheck size={16} color={colors.text} />
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.targetText, { color: colors.text }]}>
                  Promote <Text style={{ fontWeight: "700" }}>{targetName}</Text> to Founder
                </Text>
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  Submitted {dateStr}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: "rgba(217, 119, 6, 0.12)",
                  borderColor: "rgba(217, 119, 6, 0.3)",
                },
              ]}
            >
              <Text style={styles.statusBadgeText}>Waiting for Owner</Text>
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
  requestCard: {
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
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCol: {
    flex: 1,
  },
  targetText: {
    fontSize: 13,
  },
  dateText: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "600",
  },
});
