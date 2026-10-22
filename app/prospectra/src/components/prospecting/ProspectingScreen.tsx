import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Clock,
  ExternalLink,
  Globe,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
  Users,
  XCircle,
} from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { fetchProspectingData } from "../../services/prospectingService";
import type {
  CompanyFilter,
  CompanyProspect,
  EmailFilter,
  EmailProspect,
  ProspectingRole,
  ProspectingTab,
} from "../../types/prospecting";

export default function ProspectingScreen() {
  const colors = useTheme();
  const [activeTab, setActiveTab] = useState<ProspectingTab>("companies");
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>("all");
  const [emailFilter, setEmailFilter] = useState<EmailFilter>("all");

  const [userRole, setUserRole] = useState<ProspectingRole>("founder");
  const [orgName, setOrgName] = useState<string | null>(null);
  const [_, setCurrentUserId] = useState<string | null>(null);

  const [companies, setCompanies] = useState<CompanyProspect[]>([]);
  const [emails, setEmails] = useState<EmailProspect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchProspectingData();
      setCompanies(data.companies);
      setEmails(data.emails);
      setUserRole(data.role);
      setOrgName(data.orgName || null);
      setCurrentUserId(data.currentUserId);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Filter Companies
  const filteredCompanies = companies.filter((c) => {
    if (companyFilter === "all") return true;
    if (companyFilter === "rejected") return c.status === "rejected";
    if (companyFilter === "pending") {
      return (
        c.status === "pending_review" ||
        c.status === "discovered" ||
        c.status === "enriched" ||
        c.status === "pending_send_approval"
      );
    }
    return true;
  });

  // Filter Emails
  const filteredEmails = emails.filter((e) => {
    if (emailFilter === "all") return true;
    if (emailFilter === "rejected") return e.status === "rejected";
    if (emailFilter === "pending") {
      return e.status === "draft";
    }
    return true;
  });

  // Count helpers for badges
  const pendingCompaniesCount = companies.filter(
    (c) =>
      c.status === "pending_review" ||
      c.status === "discovered" ||
      c.status === "enriched" ||
      c.status === "pending_send_approval",
  ).length;
  const rejectedCompaniesCount = companies.filter(
    (c) => c.status === "rejected",
  ).length;

  const pendingEmailsCount = emails.filter((e) => e.status === "draft").length;
  const rejectedEmailsCount = emails.filter((e) => e.status === "rejected").length;

  const getCompanyStatusColor = (status: CompanyProspect["status"]) => {
    if (status === "rejected") return colors.error;
    if (
      status === "pending_review" ||
      status === "discovered" ||
      status === "enriched" ||
      status === "pending_send_approval"
    ) {
      return colors.warning;
    }
    return colors.success;
  };

  const getCompanyStatusLabel = (status: CompanyProspect["status"]) => {
    if (status === "rejected") return "Rejected";
    if (status === "pending_review") return "Pending Review";
    if (status === "discovered") return "Pending Discovery";
    if (status === "enriched") return "Pending Review";
    if (status === "pending_send_approval") return "Pending Send";
    if (status === "approved") return "Approved";
    return status.toUpperCase();
  };

  const getEmailStatusColor = (status: EmailProspect["status"]) => {
    if (status === "rejected") return colors.error;
    if (status === "draft") return colors.warning;
    return colors.success;
  };

  const renderCompanyItem = ({ item }: { item: CompanyProspect }) => {
    const statusColor = getCompanyStatusColor(item.status);
    const statusLabel = getCompanyStatusLabel(item.status);

    return (
      <View
        style={[
          styles.prospectCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.companyNameWrap}>
            <Building2 size={18} color={colors.primary} />
            <Text
              style={[styles.companyName, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </View>
          <View
            style={[
              styles.statusChip,
              { backgroundColor: `${statusColor}20`, borderColor: statusColor },
            ]}
          >
            <Text style={[styles.statusChipText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {item.domain ? (
          <View style={styles.metaRow}>
            <Globe size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.domain}
            </Text>
          </View>
        ) : null}

        <View style={styles.tagsRow}>
          {item.industry ? (
            <View
              style={[
                styles.infoBadge,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Briefcase size={12} color={colors.textSecondary} />
              <Text
                style={[styles.infoBadgeText, { color: colors.textSecondary }]}
              >
                {item.industry}
              </Text>
            </View>
          ) : null}

          {item.size ? (
            <View
              style={[
                styles.infoBadge,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Users size={12} color={colors.textSecondary} />
              <Text
                style={[styles.infoBadgeText, { color: colors.textSecondary }]}
              >
                {item.size}
              </Text>
            </View>
          ) : null}

          {item.company_auth ? (
            <View
              style={[
                styles.infoBadge,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor:
                    item.company_auth.score >= 70
                      ? colors.success
                      : colors.warning,
                },
              ]}
            >
              <Text
                style={[
                  styles.infoBadgeText,
                  {
                    color:
                      item.company_auth.score >= 70
                        ? colors.success
                        : colors.warning,
                  },
                ]}
              >
                Match: {item.company_auth.score}%
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderEmailItem = ({ item }: { item: EmailProspect }) => {
    const statusColor = getEmailStatusColor(item.status);
    const statusLabel =
      item.status === "draft"
        ? "Pending Draft"
        : item.status === "rejected"
          ? "Rejected"
          : "Approved";

    return (
      <View
        style={[
          styles.prospectCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.companyNameWrap}>
            <Mail size={18} color={colors.primary} />
            <Text
              style={[styles.companyName, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.company_name || "Target Outreach"}
            </Text>
          </View>
          <View
            style={[
              styles.statusChip,
              { backgroundColor: `${statusColor}20`, borderColor: statusColor },
            ]}
          >
            <Text style={[styles.statusChipText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.emailAddressRow}>
          <Text
            style={[styles.emailAddressText, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            To: {item.to_email || "Lead Contact"}
          </Text>
          <Text
            style={[styles.emailAddressText, { color: colors.textDisabled }]}
            numberOfLines={1}
          >
            From: {item.from_email || "Verified Agent"}
          </Text>
        </View>

        <Text
          style={[styles.emailSubject, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.email_body?.subject || item.subject}
        </Text>

        <View
          style={[
            styles.emailBodyPreview,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[styles.emailBodyText, { color: colors.textSecondary }]}
            numberOfLines={3}
          >
            {item.email_body?.body || item.body}
          </Text>
        </View>

        <View style={styles.tagsRow}>
          {item.company_domain ? (
            <View
              style={[
                styles.infoBadge,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Globe size={12} color={colors.textSecondary} />
              <Text
                style={[styles.infoBadgeText, { color: colors.textSecondary }]}
              >
                {item.company_domain}
              </Text>
            </View>
          ) : null}

          {item.verification ? (
            <View
              style={[
                styles.infoBadge,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor:
                    item.verification.score >= 70
                      ? colors.success
                      : colors.warning,
                },
              ]}
            >
              <Text
                style={[
                  styles.infoBadgeText,
                  {
                    color:
                      item.verification.score >= 70
                        ? colors.success
                        : colors.warning,
                  },
                ]}
              >
                Agent Verification: {item.verification.score}%
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Top Header with Back button on top left */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backButton,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Prospecting
            </Text>
            <View
              style={[
                styles.roleBadge,
                userRole === "founder"
                  ? {
                      backgroundColor: `${colors.primary}18`,
                      borderColor: colors.primary,
                    }
                  : {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
              ]}
            >
              {userRole === "founder" ? (
                <ShieldCheck size={11} color={colors.primary} />
              ) : (
                <User size={11} color={colors.textSecondary} />
              )}
              <Text
                style={[
                  styles.roleBadgeText,
                  {
                    color:
                      userRole === "founder"
                        ? colors.primary
                        : colors.textSecondary,
                  },
                ]}
              >
                {userRole === "founder" ? "Whole Org • Founder" : "My Assigned • Member"}
              </Text>
            </View>
          </View>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {userRole === "founder"
              ? `Whole Organization View (${orgName || "All Members"})`
              : `Comparing your User ID & Org ID`}
          </Text>
        </View>
        <Pressable
          onPress={handleRefresh}
          hitSlop={8}
          style={({ pressed }) => [
            styles.iconButton,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <RefreshCw size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Filter Chips Bar */}
      <View style={styles.filterBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {activeTab === "companies" ? (
            <>
              <Pressable
                onPress={() => setCompanyFilter("all")}
                style={[
                  styles.filterChip,
                  companyFilter === "all"
                    ? [
                        styles.activeFilterChip,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.primary,
                        },
                      ]
                    : {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color:
                        companyFilter === "all"
                          ? colors.primary
                          : colors.textSecondary,
                      fontFamily:
                        companyFilter === "all"
                          ? "DMSansSemiBold"
                          : "DMSans",
                    },
                  ]}
                >
                  All Companies ({companies.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setCompanyFilter("pending")}
                style={[
                  styles.filterChip,
                  companyFilter === "pending"
                    ? [
                        styles.activeFilterChip,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.warning,
                        },
                      ]
                    : {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Clock
                  size={13}
                  color={
                    companyFilter === "pending"
                      ? colors.warning
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color:
                        companyFilter === "pending"
                          ? colors.warning
                          : colors.textSecondary,
                      fontFamily:
                        companyFilter === "pending"
                          ? "DMSansSemiBold"
                          : "DMSans",
                    },
                  ]}
                >
                  Pending Companies ({pendingCompaniesCount})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setCompanyFilter("rejected")}
                style={[
                  styles.filterChip,
                  companyFilter === "rejected"
                    ? [
                        styles.activeFilterChip,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.error,
                        },
                      ]
                    : {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                ]}
              >
                <XCircle
                  size={13}
                  color={
                    companyFilter === "rejected"
                      ? colors.error
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color:
                        companyFilter === "rejected"
                          ? colors.error
                          : colors.textSecondary,
                      fontFamily:
                        companyFilter === "rejected"
                          ? "DMSansSemiBold"
                          : "DMSans",
                    },
                  ]}
                >
                  Rejected Companies ({rejectedCompaniesCount})
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => setEmailFilter("all")}
                style={[
                  styles.filterChip,
                  emailFilter === "all"
                    ? [
                        styles.activeFilterChip,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.primary,
                        },
                      ]
                    : {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color:
                        emailFilter === "all"
                          ? colors.primary
                          : colors.textSecondary,
                      fontFamily:
                        emailFilter === "all"
                          ? "DMSansSemiBold"
                          : "DMSans",
                    },
                  ]}
                >
                  All Emails ({emails.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setEmailFilter("pending")}
                style={[
                  styles.filterChip,
                  emailFilter === "pending"
                    ? [
                        styles.activeFilterChip,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.warning,
                        },
                      ]
                    : {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Clock
                  size={13}
                  color={
                    emailFilter === "pending"
                      ? colors.warning
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color:
                        emailFilter === "pending"
                          ? colors.warning
                          : colors.textSecondary,
                      fontFamily:
                        emailFilter === "pending"
                          ? "DMSansSemiBold"
                          : "DMSans",
                    },
                  ]}
                >
                  Pending Emails ({pendingEmailsCount})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setEmailFilter("rejected")}
                style={[
                  styles.filterChip,
                  emailFilter === "rejected"
                    ? [
                        styles.activeFilterChip,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.error,
                        },
                      ]
                    : {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                ]}
              >
                <XCircle
                  size={13}
                  color={
                    emailFilter === "rejected"
                      ? colors.error
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color:
                        emailFilter === "rejected"
                          ? colors.error
                          : colors.textSecondary,
                      fontFamily:
                        emailFilter === "rejected"
                          ? "DMSansSemiBold"
                          : "DMSans",
                    },
                  ]}
                >
                  Rejected Emails ({rejectedEmailsCount})
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>

      {/* Main List Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === "companies" ? (
        <FlatList
          data={filteredCompanies}
          keyExtractor={(item) => item.id}
          renderItem={renderCompanyItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Building2 size={36} color={colors.textDisabled} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Companies Found
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                {userRole === "founder"
                  ? `No organization companies match the selected "${companyFilter}" filter.`
                  : `No companies matching your User ID & Org ID under "${companyFilter}".`}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredEmails}
          keyExtractor={(item) => item.id}
          renderItem={renderEmailItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Mail size={36} color={colors.textDisabled} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Emails Found
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                {userRole === "founder"
                  ? `No organization outreach drafts match the selected "${emailFilter}" filter.`
                  : `No emails matching your User ID & Org ID under "${emailFilter}".`}
              </Text>
            </View>
          }
        />
      )}

      {/* Bottom Navigation Bar: Companies vs Emails */}
      <View
        style={[
          styles.bottomTabBarContainer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.bottomTabBarInner}>
          <Pressable
            onPress={() => setActiveTab("companies")}
            style={[
              styles.bottomTabButton,
              activeTab === "companies"
                ? [
                    styles.activeBottomTabButton,
                    { backgroundColor: `${colors.primary}18` },
                  ]
                : null,
            ]}
          >
            <Building2
              size={18}
              color={
                activeTab === "companies" ? colors.primary : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.bottomTabButtonText,
                {
                  color:
                    activeTab === "companies"
                      ? colors.primary
                      : colors.textSecondary,
                  fontFamily:
                    activeTab === "companies"
                      ? "DMSansBold"
                      : "DMSansMedium",
                },
              ]}
            >
              Companies
            </Text>
            <View
              style={[
                styles.bottomTabBadge,
                activeTab === "companies"
                  ? { backgroundColor: colors.primary }
                  : {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
              ]}
            >
              <Text
                style={[
                  styles.bottomTabBadgeText,
                  {
                    color:
                      activeTab === "companies"
                        ? colors.onPrimary
                        : colors.textSecondary,
                  },
                ]}
              >
                {companies.length}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("emails")}
            style={[
              styles.bottomTabButton,
              activeTab === "emails"
                ? [
                    styles.activeBottomTabButton,
                    { backgroundColor: `${colors.primary}18` },
                  ]
                : null,
            ]}
          >
            <Mail
              size={18}
              color={
                activeTab === "emails" ? colors.primary : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.bottomTabButtonText,
                {
                  color:
                    activeTab === "emails"
                      ? colors.primary
                      : colors.textSecondary,
                  fontFamily:
                    activeTab === "emails"
                      ? "DMSansBold"
                      : "DMSansMedium",
                },
              ]}
            >
              Emails
            </Text>
            <View
              style={[
                styles.bottomTabBadge,
                activeTab === "emails"
                  ? { backgroundColor: colors.primary }
                  : {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
              ]}
            >
              <Text
                style={[
                  styles.bottomTabBadgeText,
                  {
                    color:
                      activeTab === "emails"
                        ? colors.onPrimary
                        : colors.textSecondary,
                  },
                ]}
              >
                {emails.length}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: tokens.spacing.md,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontFamily: "DMSansBold",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.lg,
  },
  headerSubtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
  },
  bottomTabBarContainer: {
    borderTopWidth: 1,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xs,
    paddingBottom: tokens.spacing.sm,
  },
  bottomTabBarInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  bottomTabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    borderRadius: tokens.radius.md,
  },
  activeBottomTabButton: {},
  bottomTabButtonText: {
    fontSize: tokens.fontSize.sm,
  },
  bottomTabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomTabBadgeText: {
    fontFamily: "DMSansBold",
    fontSize: 11,
  },
  filterBarContainer: {
    paddingVertical: tokens.spacing.sm,
  },
  filterScrollContent: {
    paddingHorizontal: tokens.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  activeFilterChip: {
    borderWidth: 1.5,
  },
  filterChipText: {
    fontSize: tokens.fontSize.xs,
  },
  listContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xs,
    paddingBottom: tokens.spacing.xl,
    gap: tokens.spacing.md,
  },
  prospectCard: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    gap: tokens.spacing.sm,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  companyNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  companyName: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
  },
  statusChip: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  statusChipText: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.xs,
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.xs,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  infoBadgeText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
  emailAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.xs,
  },
  emailAddressText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
  emailSubject: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  emailBodyPreview: {
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  emailBodyText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: tokens.spacing.xl * 2,
    gap: tokens.spacing.sm,
  },
  emptyTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    marginTop: tokens.spacing.xs,
  },
  emptySubtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    textAlign: "center",
  },
});
