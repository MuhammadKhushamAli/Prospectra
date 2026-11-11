import { useCallback, useEffect, useRef, useState } from "react";
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
  CheckCircle2,
  ChevronRight,
  Clock,
  Globe,
  Layers,
  Lightbulb,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  XCircle,
} from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import {
  ensureMobileNotificationPermissions,
  fetchProspectingData,
  initiateCompanyFinder,
  requestEmailGeneration,
  sendMobileJobNotification,
  subscribeToJobWebhooks,
  subscribeToProspectingRealtime,
  updateCompanyStatusInDb,
  updateEmailStatusInDb,
} from "../../services/prospectingService";
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
import NotificationBanner from "../ui/NotificationBanner";
import type { NotificationVariant } from "../../types/ui";

export default function ProspectingScreen() {
  const colors = useTheme();
  const [activeTab, setActiveTab] = useState<ProspectingTab>("companies");
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>("all");
  const [emailFilter, setEmailFilter] = useState<EmailFilter>("all");

  const [userRole, setUserRole] = useState<ProspectingRole>("founder");
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgDomain, setOrgDomain] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [companies, setCompanies] = useState<CompanyProspect[]>([]);
  const [emails, setEmails] = useState<EmailProspect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFindingCompanies, setIsFindingCompanies] = useState(false);
  const [notification, setNotification] = useState<{
    variant: NotificationVariant;
    message: string;
  } | null>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const pushAppNotification = useCallback(
    (variant: NotificationVariant, message: string) => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
      setNotification({ variant, message });
      notificationTimerRef.current = setTimeout(() => {
        setNotification(null);
      }, 4500);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  const [processingCompanyId, setProcessingCompanyId] =
    useState<string | null>(null);

  const [selectedCompany, setSelectedCompany] =
    useState<CompanyProspect | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailProspect | null>(
    null,
  );

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
      setSelectedCompany((prev) =>
        prev ? (data.companies.find((c) => c.id === prev.id) ?? null) : null,
      );
      setSelectedEmail((prev) =>
        prev ? (data.emails.find((e) => e.id === prev.id) ?? null) : null,
      );
      setUserRole(data.role);
      setOrgName(data.orgName || null);
      setOrgDomain(data.orgDomain || null);
      setOrgId(data.orgId);
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

  const orgIdRef = useRef<string | null>(orgId);
  useEffect(() => {
    orgIdRef.current = orgId;
  }, [orgId]);

  // Subscribe to Supabase Realtime changes on companies and emails
  useEffect(() => {
    const unsubscribe = subscribeToProspectingRealtime(
      () => orgIdRef.current,
      {
        onCompanyChange: (changedCompany, eventType) => {
          setCompanies((prev) => {
            if (eventType === "DELETE") {
              return prev.filter((c) => c.id !== changedCompany.id);
            }
            const exists = prev.some((c) => c.id === changedCompany.id);
            if (exists) {
              return prev.map((c) =>
                c.id === changedCompany.id ? changedCompany : c,
              );
            }
            return [changedCompany, ...prev];
          });

          setSelectedCompany((prev) => {
            if (!prev || prev.id !== changedCompany.id) return prev;
            if (eventType === "DELETE") return null;
            return changedCompany;
          });
        },
        onEmailChange: (changedEmail, eventType) => {
          setEmails((prev) => {
            if (eventType === "DELETE") {
              return prev.filter((e) => e.id !== changedEmail.id);
            }
            const exists = prev.some((e) => e.id === changedEmail.id);
            if (exists) {
              return prev.map((e) =>
                e.id === changedEmail.id ? changedEmail : e,
              );
            }
            return [changedEmail, ...prev];
          });

          setSelectedEmail((prev) => {
            if (!prev || prev.id !== changedEmail.id) return prev;
            if (eventType === "DELETE") return null;
            return changedEmail;
          });
        },
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Subscribe to backend ARQ job webhook events and trigger native mobile OS notifications (not in-app banner, not Google services)
  useEffect(() => {
    void ensureMobileNotificationPermissions();
  }, []);

  useEffect(() => {
    if (!orgId) return;

    const unsubscribeWebhooks = subscribeToJobWebhooks(orgId, (event) => {
      if (event.task_name === "search_companies_arq_task") {
        if (event.status === "started") {
          setIsFindingCompanies(true);
          void sendMobileJobNotification(
            "Company Search Started",
            event.message ||
              "Company search started. Discovering target companies...",
          );
        } else if (event.status === "done") {
          setIsFindingCompanies(false);
          void sendMobileJobNotification(
            "Company Search Completed",
            event.message ||
              "Company search completed! Discovered companies are ready for review.",
          );
          void loadData();
        } else if (event.status === "failed" || event.status === "not_done") {
          setIsFindingCompanies(false);
          void sendMobileJobNotification(
            "Company Search Failed",
            event.message ||
              "Company search failed. Please retry fetching companies.",
          );
        }
      } else if (event.task_name === "write_email_arq_task") {
        if (event.status === "started") {
          void sendMobileJobNotification(
            "Email Generation Started",
            event.message || "Outreach email generation started...",
          );
        } else if (event.status === "done") {
          void sendMobileJobNotification(
            "Email Draft Ready",
            event.message ||
              "Outreach email draft generated and ready for review!",
          );
          void loadData();
        } else if (event.status === "failed" || event.status === "not_done") {
          void sendMobileJobNotification(
            "Email Generation Failed",
            event.message || "Outreach email generation failed.",
          );
          void loadData();
        }
      }
    });

    return () => {
      unsubscribeWebhooks();
    };
  }, [orgId, loadData]);

  const handleInitiateCompanyFinder = async () => {
    if (isFindingCompanies) return;
    setIsFindingCompanies(true);

    try {
      const res = await initiateCompanyFinder(undefined, orgId || undefined);
      if (res.status === "threshold_met") {
        setIsFindingCompanies(false);
        void sendMobileJobNotification(
          "Company Queue Full",
          "Threshold met! Target pending prospects are already available.",
        );
      } else if (res.status === "error") {
        setIsFindingCompanies(false);
        void sendMobileJobNotification(
          "Company Search Error",
          res.message || "Company search failed to start. Please retry.",
        );
      }
    } catch (err: any) {
      setIsFindingCompanies(false);
      void sendMobileJobNotification(
        "Company Search Error",
        err?.message || "Failed to initiate company search. Please retry.",
      );
    }
  };

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

  // Emails are strictly available for approved companies only
  const approvedCompanyIds = new Set(
    companies.filter((c) => c.status === "approved").map((c) => c.id),
  );

  const approvedEmails = emails.filter((e) =>
    approvedCompanyIds.has(e.company_id),
  );

  // Filter Emails
  const filteredEmails = approvedEmails.filter((e) => {
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
  const approvedCompaniesCount = approvedCompanyIds.size;

  const pendingEmailsCount = approvedEmails.filter(
    (e) => e.status === "draft",
  ).length;
  const rejectedEmailsCount = approvedEmails.filter(
    (e) => e.status === "rejected",
  ).length;
  const sentOrApprovedEmailsCount = approvedEmails.filter(
    (e) => e.status === "sent" || e.status === "approved",
  ).length;

  // Handlers for Company Decisions
  const handleAcceptCompany = async (
    company: CompanyProspect,
    selectedEmails?: string[],
  ) => {
    if (processingCompanyId === company.id) return;
    setProcessingCompanyId(company.id);

    const updatedCompany: CompanyProspect = {
      ...company,
      status: "approved",
    };

    setCompanies((prev) =>
      prev.map((c) => (c.id === company.id ? updatedCompany : c)),
    );
    setSelectedCompany(updatedCompany);

    try {
      await updateCompanyStatusInDb(company.id, "approved");
      void loadData();

      // Send email generation request to backend.
      // Notifications and DB updates are handled via the ARQ job webhook and Realtime.
      requestEmailGeneration(company.id, {
        targetOrgId: orgId || undefined,
        recipientEmails: selectedEmails,
        orgDomain: orgDomain || undefined,
      })
        .then((res) => {
          if (res && res.status === "error") {
            pushAppNotification(
              "error",
              `Could not start outreach draft generation for ${company.name}.`,
            );
            void loadData();
          }
        })
        .catch(() => {
          pushAppNotification(
            "error",
            `Could not reach email generation service for ${company.name}.`,
          );
          void loadData();
        });

      initiateCompanyFinder(undefined, orgId || undefined)
        .then((res) => {
          if (res.status === "queued" || res.status === "started") {
            setIsFindingCompanies(true);
          }
        })
        .catch((err) => {
          console.warn("Could not refill company queue:", err?.message || err);
        });
    } catch (err) {
      console.warn("Failed to approve company in DB:", err);
      pushAppNotification("error", `Failed to approve ${company.name}.`);
      void loadData();
    } finally {
      setProcessingCompanyId(null);
    }
  };

  const handleRejectCompany = async (company: CompanyProspect) => {
    if (processingCompanyId === company.id) return;
    setProcessingCompanyId(company.id);

    const updatedCompany: CompanyProspect = {
      ...company,
      status: "rejected",
    };

    setCompanies((prev) =>
      prev.map((c) => (c.id === company.id ? updatedCompany : c)),
    );
    setSelectedCompany(updatedCompany);

    setEmails((prev) =>
      prev.map((e) =>
        e.company_id === company.id ? { ...e, status: "rejected" } : e,
      ),
    );

    try {
      await updateCompanyStatusInDb(company.id, "rejected");

      initiateCompanyFinder(undefined, orgId || undefined)
        .then((res) => {
          if (res.status === "queued" || res.status === "started") {
            setIsFindingCompanies(true);
          }
        })
        .catch((err) => {
          console.warn("Could not refill company queue:", err?.message || err);
        });
    } catch (err) {
      console.warn("Failed to reject company in DB:", err);
    } finally {
      void loadData();
      setProcessingCompanyId(null);
    }
  };

  const handleSendEmail = async (email: EmailProspect) => {
    const updatedEmail: EmailProspect = {
      ...email,
      status: "sent",
    };

    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? updatedEmail : e)),
    );
    setSelectedEmail(updatedEmail);

    try {
      await updateEmailStatusInDb(email.id, "sent");
    } catch {
      // Non-fatal; fresh DB fetch below reconciles state
    } finally {
      void loadData();
    }
  };

  const handleRegenerateEmail = async (
    email: EmailProspect,
    feedback?: string,
  ) => {
    if (email.status === "sent") return;

    try {
      const response = await requestEmailGeneration(email.company_id, {
        targetOrgId: orgId || undefined,
        orgDomain: orgDomain || undefined,
        userId: currentUserId || undefined,
        feedback: feedback?.trim() || undefined,
      });

      if (response && response.status === "error") {
        pushAppNotification(
          "error",
          response.errors?.[0] ||
            response.message ||
            "Could not regenerate outreach email.",
        );
        void loadData();
      }
    } catch (err: any) {
      pushAppNotification(
        "error",
        err?.message || "Failed to reach email regeneration service.",
      );
    }
  };

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

  const getCompanyStatusSoftBg = (status: CompanyProspect["status"]) => {
    if (status === "rejected") return colors.errorSoft;
    if (
      status === "pending_review" ||
      status === "discovered" ||
      status === "enriched" ||
      status === "pending_send_approval"
    ) {
      return colors.warningSoft;
    }
    return colors.successSoft;
  };

  const getCompanyStatusBorder = (status: CompanyProspect["status"]) => {
    if (status === "rejected") return colors.errorBorder;
    if (
      status === "pending_review" ||
      status === "discovered" ||
      status === "enriched" ||
      status === "pending_send_approval"
    ) {
      return colors.warningBorder;
    }
    return colors.successBorder;
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

  const getEmailStatusSoftBg = (status: EmailProspect["status"]) => {
    if (status === "rejected") return colors.errorSoft;
    if (status === "draft") return colors.warningSoft;
    return colors.successSoft;
  };

  const getEmailStatusBorder = (status: EmailProspect["status"]) => {
    if (status === "rejected") return colors.errorBorder;
    if (status === "draft") return colors.warningBorder;
    return colors.successBorder;
  };

  const renderCompanyItem = ({ item }: { item: CompanyProspect }) => {
    const statusColor = getCompanyStatusColor(item.status);
    const statusSoft = getCompanyStatusSoftBg(item.status);
    const statusBorder = getCompanyStatusBorder(item.status);
    const statusLabel = getCompanyStatusLabel(item.status);
    const authScore = item.auth_score ?? item.company_auth?.score;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setSelectedCompany(item)}
        style={({ pressed }) => [
          styles.prospectCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View
            style={[
              styles.avatarIcon,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Building2
              size={16}
              color={colors.textSecondary}
              strokeWidth={1.75}
            />
          </View>

          <View style={styles.cardHeaderInfo}>
            <Text
              style={[styles.cardTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.domain ? (
              <View style={styles.domainRow}>
                <Globe
                  size={11}
                  color={colors.textSecondary}
                  strokeWidth={1.75}
                />
                <Text
                  style={[
                    styles.cardSubtext,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {item.domain}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardRightGroup}>
            <View
              style={[
                styles.compactStatusChip,
                {
                  backgroundColor: statusSoft,
                  borderColor: statusBorder,
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
          </View>
        </View>

        {/* Need Hypothesis preview banner */}
        {item.need_hypothesis ? (
          <View
            style={[
              styles.cardNeedBanner,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Lightbulb
              size={13}
              color={colors.primary}
              strokeWidth={1.75}
              style={{ marginTop: 2 }}
            />
            <Text
              style={[styles.cardNeedText, { color: colors.text }]}
              numberOfLines={2}
            >
              {item.need_hypothesis}
            </Text>
          </View>
        ) : null}

        {/* Needed skills tags */}
        {item.needed_skills && item.needed_skills.length > 0 ? (
          <View style={styles.cardSkillsWrap}>
            {item.needed_skills.slice(0, 3).map((skill, idx) => (
              <View
                key={idx}
                style={[
                  styles.cardSkillTag,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.cardSkillTagText, { color: colors.text }]}>
                  {skill}
                </Text>
              </View>
            ))}
            {item.needed_skills.length > 3 ? (
              <View
                style={[
                  styles.cardSkillTag,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cardSkillTagText,
                    { color: colors.textSecondary },
                  ]}
                >
                  +{item.needed_skills.length - 3}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            styles.cardMetaRow,
            { borderTopColor: colors.border },
          ]}
        >
          <View style={styles.metaPillGroup}>
            {item.industry ? (
              <View style={styles.metaInlineItem}>
                <Briefcase
                  size={11}
                  color={colors.textSecondary}
                  strokeWidth={1.75}
                />
                <Text
                  style={[styles.cardMetaText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {item.industry}
                </Text>
              </View>
            ) : null}
            {item.size ? (
              <Text
                style={[styles.cardMetaText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                • {item.size}
              </Text>
            ) : null}
          </View>

          <View style={styles.cardMetaRightGroup}>
            {authScore !== undefined ? (
              <View
                style={[
                  styles.miniMatchBadge,
                  {
                    backgroundColor:
                      authScore >= 70 ? colors.successSoft : colors.warningSoft,
                    borderColor:
                      authScore >= 70
                        ? colors.successBorder
                        : colors.warningBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.miniMatchText,
                    { color: authScore >= 70 ? colors.success : colors.warning },
                  ]}
                >
                  {authScore}% Fit
                </Text>
              </View>
            ) : null}

            {/* Show Details Button */}
            <View
              style={[
                styles.cardShowDetailBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardShowDetailText, { color: colors.text }]}>
                Inspect
              </Text>
              <ChevronRight
                size={12}
                color={colors.textSecondary}
                strokeWidth={1.75}
              />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderEmailItem = ({ item }: { item: EmailProspect }) => {
    const statusColor = getEmailStatusColor(item.status);
    const statusSoft = getEmailStatusSoftBg(item.status);
    const statusBorder = getEmailStatusBorder(item.status);
    const statusLabel =
      item.status === "draft"
        ? "Pending Draft"
        : item.status === "rejected"
          ? "Rejected"
          : item.status === "sent"
            ? "Sent"
            : "Approved";
    const verificationScore = item.verification?.score;
    const subject = item.email_body?.subject || item.subject || "No Subject";
    const bodyPreview = item.email_body?.body || item.body || "";

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setSelectedEmail(item)}
        style={({ pressed }) => [
          styles.prospectCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View
            style={[
              styles.avatarIcon,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Mail size={16} color={colors.textSecondary} strokeWidth={1.75} />
          </View>

          <View style={styles.cardHeaderInfo}>
            <Text
              style={[styles.cardTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.company_name || "Target Outreach"}
            </Text>
            {item.company_domain ? (
              <View style={styles.domainRow}>
                <Globe
                  size={11}
                  color={colors.textSecondary}
                  strokeWidth={1.75}
                />
                <Text
                  style={[
                    styles.cardSubtext,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {item.company_domain}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardRightGroup}>
            <View
              style={[
                styles.compactStatusChip,
                {
                  backgroundColor: statusSoft,
                  borderColor: statusBorder,
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
          </View>
        </View>

        <View
          style={[
            styles.emailPreviewBox,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[styles.emailCardSubject, { color: colors.text }]}
            numberOfLines={1}
          >
            {subject}
          </Text>
          {bodyPreview ? (
            <Text
              style={[styles.emailCardSnippet, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {bodyPreview}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.cardMetaRow,
            { borderTopColor: colors.border },
          ]}
        >
          <Text
            style={[styles.cardMetaText, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            AI Personalized Outreach
          </Text>

          <View style={styles.cardMetaRightGroup}>
            {verificationScore !== undefined ? (
              <View
                style={[
                  styles.miniMatchBadge,
                  {
                    backgroundColor:
                      verificationScore >= 70
                        ? colors.successSoft
                        : colors.warningSoft,
                    borderColor:
                      verificationScore >= 70
                        ? colors.successBorder
                        : colors.warningBorder,
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

            <View
              style={[
                styles.cardShowDetailBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardShowDetailText, { color: colors.text }]}>
                Open Draft
              </Text>
              <ChevronRight
                size={12}
                color={colors.textSecondary}
                strokeWidth={1.75}
              />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {notification ? (
        <NotificationBanner
          variant={notification.variant}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      ) : null}
      <View style={styles.maxContainer}>
        {/* Top Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surfaceElevated,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <ArrowLeft size={16} color={colors.text} strokeWidth={1.75} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Prospecting
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                {userRole === "founder" ? (
                  <ShieldCheck
                    size={11}
                    color={colors.textSecondary}
                    strokeWidth={1.75}
                  />
                ) : (
                  <User
                    size={11}
                    color={colors.textSecondary}
                    strokeWidth={1.75}
                  />
                )}
                <Text
                  style={[
                    styles.roleBadgeText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {userRole === "founder" ? "Founder • Org" : "Member"}
                </Text>
              </View>
            </View>
            <Text
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {userRole === "founder"
                ? `${orgName || "Organization"} Pipeline & Outreach`
                : "Assigned Prospects & Outreach Queue"}
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh"
              onPress={handleRefresh}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <RefreshCw
                size={15}
                color={colors.textSecondary}
                strokeWidth={1.75}
              />
            </Pressable>
          </View>
        </View>

        {/* KPI Metrics Strip */}
        <View style={styles.kpiRow}>
          {activeTab === "companies" ? (
            <>
              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.kpiIconWrap,
                    { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <Layers
                    size={14}
                    color={colors.textSecondary}
                    strokeWidth={1.75}
                  />
                </View>
                <View style={styles.kpiTextWrap}>
                  <Text
                    style={[styles.kpiValue, { color: colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {companies.length}
                  </Text>
                  <Text
                    style={[styles.kpiLabel, { color: colors.textSecondary }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    Total
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.kpiIconWrap,
                    { backgroundColor: colors.warningSoft },
                  ]}
                >
                  <Clock size={14} color={colors.warning} strokeWidth={1.75} />
                </View>
                <View style={styles.kpiTextWrap}>
                  <Text
                    style={[styles.kpiValue, { color: colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {pendingCompaniesCount}
                  </Text>
                  <Text
                    style={[styles.kpiLabel, { color: colors.textSecondary }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    Pending
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.kpiIconWrap,
                    { backgroundColor: colors.successSoft },
                  ]}
                >
                  <CheckCircle2
                    size={14}
                    color={colors.success}
                    strokeWidth={1.75}
                  />
                </View>
                <View style={styles.kpiTextWrap}>
                  <Text
                    style={[styles.kpiValue, { color: colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {approvedCompaniesCount}
                  </Text>
                  <Text
                    style={[styles.kpiLabel, { color: colors.textSecondary }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    Approved
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.kpiIconWrap,
                    { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <Mail
                    size={14}
                    color={colors.textSecondary}
                    strokeWidth={1.75}
                  />
                </View>
                <View style={styles.kpiTextWrap}>
                  <Text
                    style={[styles.kpiValue, { color: colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {approvedEmails.length}
                  </Text>
                  <Text
                    style={[styles.kpiLabel, { color: colors.textSecondary }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    Drafts
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.kpiIconWrap,
                    { backgroundColor: colors.warningSoft },
                  ]}
                >
                  <Clock size={14} color={colors.warning} strokeWidth={1.75} />
                </View>
                <View style={styles.kpiTextWrap}>
                  <Text
                    style={[styles.kpiValue, { color: colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {pendingEmailsCount}
                  </Text>
                  <Text
                    style={[styles.kpiLabel, { color: colors.textSecondary }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    Ready
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.kpiIconWrap,
                    { backgroundColor: colors.successSoft },
                  ]}
                >
                  <CheckCircle2
                    size={14}
                    color={colors.success}
                    strokeWidth={1.75}
                  />
                </View>
                <View style={styles.kpiTextWrap}>
                  <Text
                    style={[styles.kpiValue, { color: colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {sentOrApprovedEmailsCount}
                  </Text>
                  <Text
                    style={[styles.kpiLabel, { color: colors.textSecondary }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    Sent
                  </Text>
                </View>
              </View>
            </>
          )}
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: companyFilter === "all" }}
                  onPress={() => setCompanyFilter("all")}
                  style={[
                    styles.filterChip,
                    companyFilter === "all"
                      ? {
                          backgroundColor: colors.text,
                          borderColor: colors.text,
                        }
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
                            ? colors.background
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    All Companies ({companies.length})
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: companyFilter === "pending" }}
                  onPress={() => setCompanyFilter("pending")}
                  style={[
                    styles.filterChip,
                    companyFilter === "pending"
                      ? {
                          backgroundColor: colors.warningSoft,
                          borderColor: colors.warningBorder,
                        }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                  ]}
                >
                  <Clock
                    size={12}
                    strokeWidth={1.75}
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
                      },
                    ]}
                  >
                    Pending ({pendingCompaniesCount})
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: companyFilter === "rejected",
                  }}
                  onPress={() => setCompanyFilter("rejected")}
                  style={[
                    styles.filterChip,
                    companyFilter === "rejected"
                      ? {
                          backgroundColor: colors.errorSoft,
                          borderColor: colors.errorBorder,
                        }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                  ]}
                >
                  <XCircle
                    size={12}
                    strokeWidth={1.75}
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
                      },
                    ]}
                  >
                    Rejected ({rejectedCompaniesCount})
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: emailFilter === "all" }}
                  onPress={() => setEmailFilter("all")}
                  style={[
                    styles.filterChip,
                    emailFilter === "all"
                      ? {
                          backgroundColor: colors.text,
                          borderColor: colors.text,
                        }
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
                            ? colors.background
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    All Emails ({approvedEmails.length})
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: emailFilter === "pending" }}
                  onPress={() => setEmailFilter("pending")}
                  style={[
                    styles.filterChip,
                    emailFilter === "pending"
                      ? {
                          backgroundColor: colors.warningSoft,
                          borderColor: colors.warningBorder,
                        }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                  ]}
                >
                  <Clock
                    size={12}
                    strokeWidth={1.75}
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
                      },
                    ]}
                  >
                    Pending ({pendingEmailsCount})
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: emailFilter === "rejected" }}
                  onPress={() => setEmailFilter("rejected")}
                  style={[
                    styles.filterChip,
                    emailFilter === "rejected"
                      ? {
                          backgroundColor: colors.errorSoft,
                          borderColor: colors.errorBorder,
                        }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                  ]}
                >
                  <XCircle
                    size={12}
                    strokeWidth={1.75}
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
                      },
                    ]}
                  >
                    Rejected ({rejectedEmailsCount})
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
              <View
                style={[
                  styles.emptyContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Building2
                    size={22}
                    color={colors.textSecondary}
                    strokeWidth={1.75}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Companies Found
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {companies.length === 0
                    ? "Your prospect pipeline is currently empty. Initiate company search to discover and verify target companies."
                    : userRole === "founder"
                      ? `No organization companies match the selected "${companyFilter}" filter.`
                      : `No assigned companies match the "${companyFilter}" filter.`}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Initiate Company Finder"
                  disabled={isFindingCompanies}
                  onPress={handleInitiateCompanyFinder}
                  style={({ pressed }) => [
                    styles.initiateFinderBtn,
                    {
                      backgroundColor: isFindingCompanies
                        ? colors.surfaceElevated
                        : colors.primary,
                      borderColor: isFindingCompanies
                        ? colors.border
                        : colors.primary,
                      opacity: isFindingCompanies ? 0.65 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {isFindingCompanies ? (
                    <>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text
                        style={[
                          styles.initiateFinderBtnText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Searching for Prospects...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Sparkles
                        size={15}
                        color={colors.onPrimary}
                        strokeWidth={1.75}
                      />
                      <Text
                        style={[
                          styles.initiateFinderBtnText,
                          { color: colors.onPrimary },
                        ]}
                      >
                        Fetch Companies
                      </Text>
                    </>
                  )}
                </Pressable>
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
              <View
                style={[
                  styles.emptyContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Mail
                    size={22}
                    color={colors.textSecondary}
                    strokeWidth={1.75}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Outreach Drafts Found
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {userRole === "founder"
                    ? `Outreach email drafts appear once target companies are approved. No drafts currently match "${emailFilter}".`
                    : `Outreach drafts for your approved companies under "${emailFilter}".`}
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
          <View
            accessibilityRole="tablist"
            style={[
              styles.bottomTabBarInner,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === "companies" }}
              onPress={() => setActiveTab("companies")}
              style={[
                styles.bottomTabButton,
                activeTab === "companies"
                  ? [
                      styles.activeBottomTabButton,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]
                  : null,
              ]}
            >
              <Building2
                size={15}
                strokeWidth={1.75}
                color={
                  activeTab === "companies"
                    ? colors.text
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.bottomTabButtonText,
                  {
                    color:
                      activeTab === "companies"
                        ? colors.text
                        : colors.textSecondary,
                    fontFamily:
                      activeTab === "companies"
                        ? "DMSansSemiBold"
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
                    ? {
                        backgroundColor: colors.primarySoft,
                        borderColor: colors.primaryBorder,
                      }
                    : {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Text
                  style={[
                    styles.bottomTabBadgeText,
                    {
                      color:
                        activeTab === "companies"
                          ? colors.primary
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {companies.length}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === "emails" }}
              onPress={() => setActiveTab("emails")}
              style={[
                styles.bottomTabButton,
                activeTab === "emails"
                  ? [
                      styles.activeBottomTabButton,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]
                  : null,
              ]}
            >
              <Mail
                size={15}
                strokeWidth={1.75}
                color={
                  activeTab === "emails" ? colors.text : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.bottomTabButtonText,
                  {
                    color:
                      activeTab === "emails"
                        ? colors.text
                        : colors.textSecondary,
                    fontFamily:
                      activeTab === "emails"
                        ? "DMSansSemiBold"
                        : "DMSansMedium",
                  },
                ]}
              >
                Outreach
              </Text>
              <View
                style={[
                  styles.bottomTabBadge,
                  activeTab === "emails"
                    ? {
                        backgroundColor: colors.primarySoft,
                        borderColor: colors.primaryBorder,
                      }
                    : {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Text
                  style={[
                    styles.bottomTabBadgeText,
                    {
                      color:
                        activeTab === "emails"
                          ? colors.primary
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {approvedEmails.length}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Company Detail Modal */}
      <CompanyDetailModal
        visible={Boolean(selectedCompany)}
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
        associatedEmail={
          selectedCompany
            ? getAssociatedEmailForCompany(selectedCompany.id)
            : null
        }
        onViewEmail={(email) => {
          setSelectedCompany(null);
          setSelectedEmail(email);
        }}
        onAcceptCompany={handleAcceptCompany}
        onRejectCompany={handleRejectCompany}
      />

      {/* Email Detail Modal */}
      <EmailDetailModal
        visible={Boolean(selectedEmail)}
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
        associatedCompany={
          selectedEmail
            ? getAssociatedCompanyForEmail(selectedEmail.company_id)
            : null
        }
        onViewCompany={(company) => {
          setSelectedEmail(null);
          setSelectedCompany(company);
        }}
        onSendEmail={handleSendEmail}
        onRegenerateEmail={handleRegenerateEmail}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  maxContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm + 4,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initiateFinderBtn: {
    marginTop: tokens.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs + 2,
    paddingHorizontal: tokens.spacing.md + 4,
    paddingVertical: tokens.spacing.sm + 2,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  initiateFinderBtnText: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: tokens.spacing.sm + 4,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  headerTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  kpiRow: {
    flexDirection: "row",
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.xs,
    gap: tokens.spacing.sm,
  },
  kpiCard: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm + 2,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    ...tokens.shadow.sm,
  },
  kpiIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 6,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiTextWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  kpiValue: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  kpiLabel: {
    fontFamily: "DMSans",
    fontSize: 11,
    lineHeight: 14,
  },
  bottomTabBarContainer: {
    borderTopWidth: 1,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm + 2,
  },
  bottomTabBarInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: tokens.spacing.xs,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: tokens.spacing.xs,
  },
  bottomTabButton: {
    flex: 1,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs + 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  activeBottomTabButton: {
    ...tokens.shadow.sm,
  },
  bottomTabButtonText: {
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  bottomTabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomTabBadgeText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 14,
  },
  filterBarContainer: {
    paddingVertical: tokens.spacing.sm + 2,
  },
  filterScrollContent: {
    paddingHorizontal: tokens.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  filterChip: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
    paddingHorizontal: tokens.spacing.sm + 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  filterChipText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  listContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xs,
    paddingBottom: tokens.spacing.xl,
    gap: tokens.spacing.sm + 4,
  },
  prospectCard: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    gap: tokens.spacing.sm + 2,
    ...tokens.shadow.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm + 2,
  },
  avatarIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  cardSubtext: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  cardRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
  },
  compactStatusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  compactStatusDot: {
    width: 6,
    height: 6,
    borderRadius: tokens.radius.full,
  },
  compactStatusText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 14,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.sm,
    paddingTop: tokens.spacing.sm,
    marginTop: 2,
    borderTopWidth: 1,
  },
  metaPillGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
    marginRight: tokens.spacing.xs,
  },
  metaInlineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    flexShrink: 1,
  },
  cardMetaText: {
    flexShrink: 1,
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  miniMatchBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
    alignSelf: "center",
  },
  miniMatchText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 14,
  },
  emailPreviewBox: {
    padding: tokens.spacing.sm + 2,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: 2,
  },
  emailCardSubject: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  emailCardSnippet: {
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
    paddingVertical: tokens.spacing.xl,
    paddingHorizontal: tokens.spacing.lg,
    marginTop: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    gap: tokens.spacing.sm,
    ...tokens.shadow.sm,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.spacing.xs,
  },
  emptyTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  cardNeedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm + 2,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  cardNeedText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
    flex: 1,
  },
  cardSkillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs + 2,
  },
  cardSkillTag: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  cardSkillTagText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  cardMetaRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
  },
  cardShowDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  cardShowDetailText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
});
