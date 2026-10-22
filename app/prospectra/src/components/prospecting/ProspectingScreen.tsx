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
  ChevronRight,
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
import CompanyDetailModal from "./CompanyDetailModal";
import EmailDetailModal from "./EmailDetailModal";

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

  const [selectedCompany, setSelectedCompany] = useState<CompanyProspect | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailProspect | null>(null);

  const getAssociatedEmailForCompany = (companyId: string) => {
    return emails.find((e) => e.company_id === companyId) || null;
  };

  const getAssociatedCompanyForEmail = (companyId: string) => {
    return companies.find((c) => c.id === companyId) || null;
  };

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
    const authScore = item.company_auth?.score;

    return (
      <Pressable
        onPress={() => setSelectedCompany(item)}
        style={({ pressed }) => [
          styles.prospectCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View
            style={[
              styles.avatarIcon,
              {
                backgroundColor: `${colors.primary}12`,
                borderColor: `${colors.primary}30`,
              },
            ]}
          >
            <Building2 size={16} color={colors.primary} />
          </View>

          <View style={styles.cardHeaderInfo}>
            <Text
              style={[styles.cardTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.domain ? (
              <Text
                style={[styles.cardSubtext, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.domain}
              </Text>
            ) : null}
          </View>

          <View style={styles.cardRightGroup}>
            <View
              style={[
                styles.compactStatusChip,
                {
                  backgroundColor: `${statusColor}18`,
                  borderColor: `${statusColor}50`,
                },
              ]}
            >
              <View
                style={[
                  styles.compactStatusDot,
                  { backgroundColor: statusColor },
                ]}
              />
              <Text style={[styles.compactStatusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
            <ChevronRight size={15} color={colors.textDisabled} />
          </View>
        </View>

        <View style={styles.cardMetaRow}>
          <Text
            style={[styles.cardMetaText, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {[item.industry, item.size].filter(Boolean).join(" • ")}
          </Text>

          {authScore !== undefined ? (
            <View
              style={[
                styles.miniMatchBadge,
                {
                  backgroundColor:
                    authScore >= 70
                      ? `${colors.success}15`
                      : `${colors.warning}15`,
                  borderColor:
                    authScore >= 70
                      ? `${colors.success}40`
                      : `${colors.warning}40`,
                },
              ]}
            >
              <Text
                style={[
                  styles.miniMatchText,
                  { color: authScore >= 70 ? colors.success : colors.warning },
                ]}
              >
                {authScore}% Match
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
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
    const verificationScore = item.verification?.score;
    const subject = item.email_body?.subject || item.subject || "No Subject";
    const bodyPreview = item.email_body?.body || item.body || "";

    return (
      <Pressable
        onPress={() => setSelectedEmail(item)}
        style={({ pressed }) => [
          styles.prospectCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View
            style={[
              styles.avatarIcon,
              {
                backgroundColor: `${colors.primary}12`,
                borderColor: `${colors.primary}30`,
              },
            ]}
          >
            <Mail size={16} color={colors.primary} />
          </View>

          <View style={styles.cardHeaderInfo}>
            <Text
              style={[styles.cardTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.company_name || "Target Outreach"}
            </Text>
            {item.company_domain ? (
              <Text
                style={[styles.cardSubtext, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.company_domain}
              </Text>
            ) : null}
          </View>

          <View style={styles.cardRightGroup}>
            <View
              style={[
                styles.compactStatusChip,
                {
                  backgroundColor: `${statusColor}18`,
                  borderColor: `${statusColor}50`,
                },
              ]}
            >
              <View
                style={[
                  styles.compactStatusDot,
                  { backgroundColor: statusColor },
                ]}
              />
              <Text style={[styles.compactStatusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
            <ChevronRight size={15} color={colors.textDisabled} />
          </View>
        </View>

        <Text
          style={[styles.emailCardSubject, { color: colors.text }]}
          numberOfLines={1}
        >
          {subject}
        </Text>

        <View style={styles.cardMetaRow}>
          <Text
            style={[styles.emailCardSnippet, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {bodyPreview}
          </Text>

          {verificationScore !== undefined ? (
            <View
              style={[
                styles.miniMatchBadge,
                {
                  backgroundColor:
                    verificationScore >= 70
                      ? `${colors.success}15`
                      : `${colors.warning}15`,
                  borderColor:
                    verificationScore >= 70
                      ? `${colors.success}40`
                      : `${colors.warning}40`,
                },
              ]}
            >
              <Text
                style={[
                  styles.miniMatchText,
                  {
                    color:
                      verificationScore >= 70
                        ? colors.success
                        : colors.warning,
                  },
                ]}
              >
                {verificationScore}% Verified
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
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

      {/* Company Detail Modal */}
      <CompanyDetailModal
        visible={Boolean(selectedCompany)}
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
        associatedEmail={
          selectedCompany ? getAssociatedEmailForCompany(selectedCompany.id) : null
        }
        onViewEmail={(email) => {
          setSelectedCompany(null);
          setSelectedEmail(email);
        }}
      />

      {/* Email Detail Modal */}
      <EmailDetailModal
        visible={Boolean(selectedEmail)}
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
        associatedCompany={
          selectedEmail ? getAssociatedCompanyForEmail(selectedEmail.company_id) : null
        }
        onViewCompany={(company) => {
          setSelectedEmail(null);
          setSelectedCompany(company);
        }}
      />
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
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  avatarIcon: {
    width: 34,
    height: 34,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
  },
  cardSubtext: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    marginTop: 1,
  },
  cardRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactStatusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  compactStatusDot: {
    width: 6,
    height: 6,
    borderRadius: tokens.radius.full,
  },
  compactStatusText: {
    fontFamily: "DMSansBold",
    fontSize: 10,
    letterSpacing: 0.2,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.sm,
    marginTop: 2,
  },
  cardMetaText: {
    flex: 1,
    flexShrink: 1,
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    marginRight: 6,
  },
  miniMatchBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    flexShrink: 0,
    alignSelf: "center",
  },
  miniMatchText: {
    fontFamily: "DMSansBold",
    fontSize: 10,
  },
  emailCardSubject: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
    lineHeight: 19,
  },
  emailCardSnippet: {
    flex: 1,
    flexShrink: 1,
    fontFamily: "DMSans",
    fontSize: 11,
    lineHeight: 16,
    marginRight: 6,
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
  tapDetailsPrompt: {
    marginTop: 2,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150, 150, 150, 0.15)",
  },
  tapDetailsText: {
    fontFamily: "DMSansMedium",
    fontSize: 11,
  },
});

