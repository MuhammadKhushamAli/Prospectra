import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, ShieldAlert, UserPlus, Users } from "lucide-react-native";
import { router } from "expo-router";

import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "@/hooks/useTheme";
import type { OrgMember } from "@/types/admin";

import { AdminHeader } from "./AdminHeader";
import { ApprovalsSection } from "./ApprovalsSection";
import { InviteMemberModal } from "./InviteMemberModal";
import { MemberRow } from "./MemberRow";
import { MyRequestsSection } from "./MyRequestsSection";
import { PendingInvitesSection } from "./PendingInvitesSection";
import { TeammateActivityModal } from "./TeammateActivityModal";

export const AdminScreen: React.FC = () => {
  const colors = useTheme();
  const isDark = useColorScheme() === "dark";
  const {
    actor,
    members,
    invites,
    approvals,
    myRequests,
    loading,
    refreshing,
    actionInProgress,
    error,
    refresh,
    inviteMember,
    changeRole,
    removeMember,
    revokeInvite,
    decideApproval,
  } = useAdmin();

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [activityMember, setActivityMember] = useState<OrgMember | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase().trim();
    return members.filter(
      (m) =>
        (m.full_name && m.full_name.toLowerCase().includes(query)) ||
        (m.email && m.email.toLowerCase().includes(query)),
    );
  }, [members, searchQuery]);

  if (loading && !actor) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingLabel, { color: colors.textSecondary }]}>
            Loading team management...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Restricted access fallback if user is not a founder
  if (actor && !actor.is_founder) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.restrictedContainer}>
          <ShieldAlert size={48} color="#EF4444" />
          <Text style={[styles.restrictedTitle, { color: colors.text }]}>
            Access Restricted
          </Text>
          <Text style={[styles.restrictedDesc, { color: colors.textSecondary }]}>
            Team management is only accessible to organization founders and owners.
          </Text>
          <Pressable
            onPress={() => router.replace("/home")}
            style={[styles.homeBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.homeBtnText}>Return to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <AdminHeader
        actor={actor}
        onRefresh={refresh}
        onOpenInvite={() => setInviteModalVisible(true)}
        isRefreshing={refreshing}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Error Notification */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Approvals Section (Owner Only) */}
        {actor?.is_owner && (
          <ApprovalsSection
            approvals={approvals}
            actionInProgress={actionInProgress}
            onDecideApproval={decideApproval}
          />
        )}

        {/* My Requests Section (Non-Owner Founders) */}
        {!actor?.is_owner && myRequests.length > 0 && (
          <MyRequestsSection requests={myRequests} />
        )}

        {/* Pending Invitations */}
        <PendingInvitesSection
          invites={invites}
          actionInProgress={actionInProgress}
          onRevokeInvite={revokeInvite}
        />

        {/* Members List Section */}
        <View style={styles.membersSection}>
          <View style={styles.membersHeaderRow}>
            <View style={styles.membersTitleRow}>
              <Users size={16} color={colors.textSecondary} />
              <Text style={[styles.membersTitle, { color: colors.text }]}>
                Team Members ({filteredMembers.length})
              </Text>
            </View>

            <Pressable
              onPress={() => setInviteModalVisible(true)}
              style={({ pressed }) => [
                styles.sectionInviteBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityLabel="Invite Teammate"
            >
              <UserPlus size={13} color="#FFFFFF" />
              <Text style={styles.sectionInviteBtnText}>Invite Teammate</Text>
            </Pressable>
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or email..."
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>

          {filteredMembers.map((member) => (
            <MemberRow
              key={member.user_id}
              member={member}
              actor={actor}
              isCurrentActor={actor?.user_id === member.user_id}
              isActionLoading={
                actionInProgress === `role-${member.user_id}` ||
                actionInProgress === `remove-${member.user_id}`
              }
              onChangeRole={changeRole}
              onRemoveMember={removeMember}
              onViewActivity={(m) => setActivityMember(m)}
            />
          ))}

          {filteredMembers.length === 0 && (
            <View style={styles.emptySearch}>
              <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
                No team members match your search.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Invite Teammate Modal */}
      <InviteMemberModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        onInvite={inviteMember}
      />

      {/* Teammate Activity Modal */}
      <TeammateActivityModal
        visible={!!activityMember}
        member={activityMember}
        onClose={() => setActivityMember(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingLabel: {
    fontSize: 14,
  },
  restrictedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 12,
  },
  restrictedTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  restrictedDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 10,
  },
  homeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  homeBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#EF4444",
    fontSize: 13,
  },
  membersSection: {
    marginTop: 8,
  },
  membersHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  membersTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  membersTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionInviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sectionInviteBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: "100%",
  },
  emptySearch: {
    padding: 30,
    alignItems: "center",
  },
  emptySearchText: {
    fontSize: 13,
  },
});
