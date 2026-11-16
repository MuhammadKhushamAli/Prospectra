import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { Building2, Globe, Mail, Send, X } from "lucide-react-native";

import { useTheme } from "@/hooks/useTheme";
import { adminService } from "@/services/adminService";
import type { OrgMember } from "@/types/admin";

interface TeammateActivityModalProps {
  visible: boolean;
  member: OrgMember | null;
  onClose: () => void;
}

export const TeammateActivityModal: React.FC<TeammateActivityModalProps> = ({
  visible,
  member,
  onClose,
}) => {
  const colors = useTheme();
  const isDark = useColorScheme() === "dark";
  const [activeTab, setActiveTab] = useState<"companies" | "emails">("companies");
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !member) {
      setCompanies([]);
      setEmails([]);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      adminService.fetchMemberCompanies(member.user_id),
      adminService.fetchMemberEmails(member.user_id),
    ])
      .then(([compList, emailList]) => {
        if (!isMounted) return;
        setCompanies(compList || []);
        setEmails(emailList || []);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err?.message || "Failed to load teammate activity.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, member]);

  if (!member) {
    return null;
  }

  const memberName = member.full_name || member.email?.split("@")[0] || "Teammate";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: isDark ? "#14171C" : colors.background,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={styles.headerInfo}>
              <Text style={[styles.title, { color: colors.text }]}>Teammate Activity</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {memberName} ({member.email || "No email"})
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityLabel="Close activity modal"
            >
              <X size={18} color={colors.text} />
            </Pressable>
          </View>

          {/* Tab Selector */}
          <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
            <Pressable
              onPress={() => setActiveTab("companies")}
              style={[
                styles.tabBtn,
                activeTab === "companies" && [
                  styles.activeTabBtn,
                  { borderBottomColor: colors.primary },
                ],
              ]}
            >
              <Building2
                size={16}
                color={activeTab === "companies" ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "companies" ? colors.primary : colors.textSecondary,
                    fontWeight: activeTab === "companies" ? "700" : "500",
                  },
                ]}
              >
                Companies ({companies.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab("emails")}
              style={[
                styles.tabBtn,
                activeTab === "emails" && [
                  styles.activeTabBtn,
                  { borderBottomColor: colors.primary },
                ],
              ]}
            >
              <Send
                size={16}
                color={activeTab === "emails" ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === "emails" ? colors.primary : colors.textSecondary,
                    fontWeight: activeTab === "emails" ? "700" : "500",
                  },
                ]}
              >
                Emails ({emails.length})
              </Text>
            </Pressable>
          </View>

          {/* Content Body */}
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading activity data...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.centerState}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : activeTab === "companies" ? (
            companies.length === 0 ? (
              <View style={styles.centerState}>
                <Building2 size={32} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No companies prospected by {memberName} yet.
                </Text>
              </View>
            ) : (
              <FlatList
                data={companies}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.itemCard,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.03)" : colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.itemTop}>
                      <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.status && (
                        <View
                          style={[
                            styles.itemBadge,
                            {
                              backgroundColor: "rgba(224, 138, 82, 0.12)",
                              borderColor: colors.primary,
                            },
                          ]}
                        >
                          <Text style={[styles.itemBadgeText, { color: colors.primary }]}>
                            {item.status}
                          </Text>
                        </View>
                      )}
                    </View>

                    {item.domain && (
                      <View style={styles.subInfoRow}>
                        <Globe size={12} color={colors.textSecondary} />
                        <Text style={[styles.subInfoText, { color: colors.textSecondary }]}>
                          {item.domain}
                        </Text>
                      </View>
                    )}

                    {item.industry && (
                      <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
                        Industry: {item.industry}
                      </Text>
                    )}
                  </View>
                )}
              />
            )
          ) : emails.length === 0 ? (
            <View style={styles.centerState}>
              <Mail size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No outreach emails sent by {memberName} yet.
              </Text>
            </View>
          ) : (
            <FlatList
              data={emails}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.03)" : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.itemTop}>
                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                      {item.subject || "No Subject"}
                    </Text>
                    {item.status && (
                      <View
                        style={[
                          styles.itemBadge,
                          {
                            backgroundColor: "rgba(217, 119, 6, 0.12)",
                            borderColor: "rgba(217, 119, 6, 0.3)",
                          },
                        ]}
                      >
                        <Text style={[styles.itemBadgeText, { color: "#D97706" }]}>
                          {item.status}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.subInfoRow}>
                    <Mail size={12} color={colors.textSecondary} />
                    <Text style={[styles.subInfoText, { color: colors.textSecondary }]}>
                      To: {item.recipient_email || item.recipient_name || "Unknown"}
                    </Text>
                  </View>

                  {item.sender_email && (
                    <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
                      From: {item.sender_email}
                    </Text>
                  )}

                  <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
                    Date: {new Date(item.created_at).toLocaleString()}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "85%",
    minHeight: 460,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabBtn: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
  },
  centerState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 24,
  },
  itemCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  itemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 8,
  },
  itemBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  subInfoText: {
    fontSize: 12,
  },
  metaDetail: {
    fontSize: 11,
    marginTop: 3,
  },
});
