import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import {
  Activity,
  AlertCircle,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  Copy,
  Cpu,
  ExternalLink,
  FileText,
  Globe,
  Layers,
  Lightbulb,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import type { CompanyDetailModalProps, CompanyProspect } from "../../types/prospecting";

export interface SelectableCompanyEmail {
  email: string;
  name?: string;
  role?: string;
  isVerified?: boolean;
}

export function extractSelectableEmails(company: CompanyProspect | null): SelectableCompanyEmail[] {
  if (!company) return [];

  const list: SelectableCompanyEmail[] = [];
  const seen = new Set<string>();

  // 1. From company.emails
  if (company.emails && Array.isArray(company.emails)) {
    for (const em of company.emails) {
      const clean = em.email?.trim()?.toLowerCase();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        const nameParts = [em.first_name, em.last_name].filter(Boolean).join(" ").trim();
        list.push({
          email: em.email.trim(),
          name: nameParts || undefined,
          role: em.email_of || "Contact",
          isVerified: em.is_verified,
        });
      }
    }
  }

  // 2. Fallback to raw_signals contacts / emails if list is still empty
  if (list.length === 0 && company.raw_signals) {
    const rawEmails = company.raw_signals.emails || company.raw_signals.contacts || [];
    if (Array.isArray(rawEmails)) {
      for (const item of rawEmails) {
        const rawStr = typeof item === "string" ? item : item?.email;
        const clean = rawStr?.trim()?.toLowerCase();
        if (clean && !seen.has(clean)) {
          seen.add(clean);
          list.push({
            email: clean,
            role: typeof item === "object" ? item?.role || item?.email_of : "Discovered Contact",
          });
        }
      }
    }
  }

  return list;
}

export default function CompanyDetailModal({
  company,
  visible,
  onClose,
  onViewEmail,
  associatedEmail,
  onAcceptCompany,
  onRejectCompany,
}: CompanyDetailModalProps) {
  const colors = useTheme();
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const availableEmails = useMemo(
    () => extractSelectableEmails(company),
    [company?.id, company?.domain, company?.emails, company?.raw_signals],
  );

  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // Automatically select all available emails whenever the company changes or modal opens
  useEffect(() => {
    if (availableEmails.length > 0) {
      setSelectedEmails(new Set(availableEmails.map((e) => e.email)));
    } else {
      setSelectedEmails(new Set());
    }
  }, [availableEmails]);

  const isAllSelected =
    availableEmails.length > 0 && selectedEmails.size === availableEmails.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(availableEmails.map((e) => e.email)));
    }
  };

  const handleToggleEmail = (emailStr: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(emailStr)) {
        next.delete(emailStr);
      } else {
        next.add(emailStr);
      }
      return next;
    });
  };

  if (!company) return null;

  const isPending =
    company.status === "pending_review" ||
    company.status === "discovered" ||
    company.status === "enriched";

  const handleAccept = async () => {
    if (!onAcceptCompany || isAccepting || isRejecting || selectedEmails.size === 0) return;
    try {
      setIsAccepting(true);
      await onAcceptCompany(company, Array.from(selectedEmails));
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!onRejectCompany || isAccepting || isRejecting) return;
    try {
      setIsRejecting(true);
      await onRejectCompany(company);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCopyDomain = async () => {
    if (!company.domain) return;
    await Clipboard.setStringAsync(company.domain);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  const handleOpenWebsite = () => {
    const url =
      company.website || (company.domain ? `https://${company.domain}` : null);
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const getStatusColor = () => {
    if (company.status === "rejected") return colors.error;
    if (
      company.status === "pending_review" ||
      company.status === "discovered" ||
      company.status === "enriched"
    ) {
      return colors.warning;
    }
    return colors.success;
  };

  const getStatusSoft = () => {
    if (company.status === "rejected") return colors.errorSoft;
    if (
      company.status === "pending_review" ||
      company.status === "discovered" ||
      company.status === "enriched"
    ) {
      return colors.warningSoft;
    }
    return colors.successSoft;
  };

  const getStatusBorder = () => {
    if (company.status === "rejected") return colors.errorBorder;
    if (
      company.status === "pending_review" ||
      company.status === "discovered" ||
      company.status === "enriched"
    ) {
      return colors.warningBorder;
    }
    return colors.successBorder;
  };

  const getStatusLabel = () => {
    if (company.status === "rejected") return "Rejected";
    if (
      company.status === "pending_review" ||
      company.status === "discovered" ||
      company.status === "enriched"
    ) {
      return "Pending";
    }
    return "Approved";
  };

  const statusColor = getStatusColor();
  const statusSoft = getStatusSoft();
  const statusBorder = getStatusBorder();
  const authScore = company.auth_score ?? company.company_auth?.score;
  const authFeedback = company.auth_feedback || company.company_auth?.feedback;
  const userSkills = company.company_auth?.user_skills || [];

  const needHypothesis = company.need_hypothesis;
  const neededSkills =
    company.needed_skills && company.needed_skills.length > 0
      ? company.needed_skills
      : userSkills;
  const neededServices = company.needed_services || [];
  const needSignals = company.need_signals || [];
  const proposedSolution = company.proposed_solution;
  const servicesOffered = company.services_offered || [];
  const digitalFeatures = company.digital_features || [];
  const aboutText = company.about_text;
  const emails = company.emails || [];

  const formattedDate = company.created_at
    ? new Date(company.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Sheet Handle */}
          <View style={styles.handleRow}>
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />
          </View>

          {/* Sheet Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Building2 size={18} color={colors.text} strokeWidth={1.75} />
              </View>
              <View style={styles.headerTextWrap}>
                <Text
                  style={[styles.companyTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {company.name}
                </Text>
                <Text
                  style={[
                    styles.companySubtitle,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  Company Prospect Intelligence
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <X size={16} color={colors.textSecondary} strokeWidth={1.75} />
            </Pressable>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Status & Primary Highlights */}
            <View style={styles.statusHighlightRow}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusSoft,
                    borderColor: statusBorder,
                  },
                ]}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor }]}
                />
                <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                  {getStatusLabel()}
                </Text>
              </View>

              {company.domain ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleCopyDomain}
                  style={({ pressed }) => [
                    styles.copyDomainButton,
                    {
                      backgroundColor: copiedDomain
                        ? colors.successSoft
                        : colors.surfaceElevated,
                      borderColor: copiedDomain
                        ? colors.successBorder
                        : colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  {copiedDomain ? (
                    <Check
                      size={12}
                      color={colors.success}
                      strokeWidth={1.75}
                    />
                  ) : (
                    <Copy
                      size={12}
                      color={colors.textSecondary}
                      strokeWidth={1.75}
                    />
                  )}
                  <Text
                    style={[
                      styles.copyDomainText,
                      { color: copiedDomain ? colors.success : colors.text },
                    ]}
                  >
                    {copiedDomain ? "Copied!" : company.domain}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* Match Score Quick Banner */}
            {authScore !== undefined ? (
              <View
                style={[
                  styles.scoreQuickBanner,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.scoreQuickLeft}>
                  <ShieldCheck
                    size={16}
                    strokeWidth={1.75}
                    color={authScore >= 70 ? colors.success : colors.warning}
                  />
                  <Text
                    style={[styles.scoreQuickLabel, { color: colors.text }]}
                  >
                    AI Buyer Match Score
                  </Text>
                </View>
                <View
                  style={[
                    styles.scorePill,
                    {
                      backgroundColor:
                        authScore >= 70
                          ? colors.successSoft
                          : colors.warningSoft,
                      borderColor:
                        authScore >= 70
                          ? colors.successBorder
                          : colors.warningBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.scorePillText,
                      {
                        color: authScore >= 70 ? colors.success : colors.warning,
                      },
                    ]}
                  >
                    {authScore}% Match
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Review Decision: Accept or Reject */}
            {isPending && (onAcceptCompany || onRejectCompany) ? (
              <View
                style={[
                  styles.card,
                  styles.decisionCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.decisionHeader}>
                  <View
                    style={[
                      styles.decisionHeaderIcon,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <ShieldCheck
                      size={16}
                      color={colors.primary}
                      strokeWidth={1.75}
                    />
                  </View>
                  <View style={styles.decisionHeaderTextWrap}>
                    <Text style={[styles.decisionTitle, { color: colors.text }]}>
                      Review Decision
                    </Text>
                    <Text
                      style={[
                        styles.decisionSubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Accepting approves this prospect and unlocks AI outreach
                      drafting.
                    </Text>
                  </View>
                </View>

                {/* Email Recipients Selection */}
                {onAcceptCompany ? (
                  <View style={styles.recipientSection}>
                    <View style={styles.recipientHeaderRow}>
                      <View style={styles.recipientTitleWrap}>
                        <Mail
                          size={13}
                          color={colors.primary}
                          strokeWidth={1.75}
                        />
                        <Text
                          style={[styles.recipientTitle, { color: colors.text }]}
                        >
                          Outreach Recipients
                        </Text>
                      </View>

                      {/* Select All Toggle Button */}
                      {availableEmails.length > 0 ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={handleToggleSelectAll}
                          hitSlop={6}
                          style={styles.selectAllBtn}
                        >
                          <Text
                            style={[
                              styles.selectAllBtnText,
                              { color: colors.primary },
                            ]}
                          >
                            {isAllSelected ? "Deselect All" : "Select All"}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>

                    {/* Email Checkbox Options List */}
                    {availableEmails.length > 0 ? (
                      <View style={styles.recipientList}>
                        {availableEmails.map((item) => {
                          const isSelected = selectedEmails.has(item.email);
                          return (
                            <Pressable
                              key={item.email}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: isSelected }}
                              onPress={() => handleToggleEmail(item.email)}
                              style={[
                                styles.recipientOptionRow,
                                {
                                  backgroundColor: isSelected
                                    ? colors.surface
                                    : colors.surfaceElevated,
                                  borderColor: isSelected
                                    ? colors.primary
                                    : colors.border,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.checkboxBox,
                                  {
                                    borderColor: isSelected
                                      ? colors.primary
                                      : colors.border,
                                    backgroundColor: isSelected
                                      ? colors.primary
                                      : "transparent",
                                  },
                                ]}
                              >
                                {isSelected && (
                                  <Check
                                    size={11}
                                    color={colors.onPrimary}
                                    strokeWidth={2.5}
                                  />
                                )}
                              </View>

                              <View style={styles.recipientInfo}>
                                <Text
                                  style={[
                                    styles.recipientEmailText,
                                    {
                                      color: isSelected
                                        ? colors.text
                                        : colors.textSecondary,
                                    },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {item.email}
                                </Text>
                                {item.name || item.role ? (
                                  <Text
                                    style={[
                                      styles.recipientRoleText,
                                      { color: colors.textMuted },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {item.name ? `${item.name} • ` : ""}
                                    {item.role || "Contact"}
                                  </Text>
                                ) : null}
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}

                    {/* Validation Warning if 0 selected */}
                    {selectedEmails.size === 0 ? (
                      <View
                        style={[
                          styles.validationWarningRow,
                          {
                            backgroundColor: colors.errorSoft,
                            borderColor: colors.errorBorder,
                          },
                        ]}
                      >
                        <AlertCircle
                          size={13}
                          color={colors.error}
                          strokeWidth={1.75}
                        />
                        <Text
                          style={[
                            styles.validationWarningText,
                            { color: colors.error },
                          ]}
                        >
                          {availableEmails.length === 0
                            ? "No verified outreach emails available for this company."
                            : "At least one email is required to accept and send outreach."}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.decisionButtonsRow}>
                  {onAcceptCompany ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={handleAccept}
                      disabled={
                        isAccepting ||
                        isRejecting ||
                        selectedEmails.size === 0
                      }
                      style={({ pressed }) => [
                        styles.acceptBtn,
                        {
                          backgroundColor: colors.primary,
                          opacity:
                            pressed ||
                            isAccepting ||
                            isRejecting ||
                            selectedEmails.size === 0
                              ? 0.6
                              : 1,
                        },
                      ]}
                    >
                      {isAccepting ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.onPrimary}
                        />
                      ) : (
                        <>
                          <Check
                            size={15}
                            color={colors.onPrimary}
                            strokeWidth={1.75}
                          />
                          <Text
                            style={[
                              styles.decisionBtnText,
                              { color: colors.onPrimary },
                            ]}
                          >
                            Accept Company
                          </Text>
                        </>
                      )}
                    </Pressable>
                  ) : null}

                  {onRejectCompany ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={handleReject}
                      disabled={isAccepting || isRejecting}
                      style={({ pressed }) => [
                        styles.rejectBtn,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          opacity:
                            pressed || isAccepting || isRejecting ? 0.85 : 1,
                        },
                      ]}
                    >
                      {isRejecting ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <>
                          <X
                            size={15}
                            color={colors.error}
                            strokeWidth={1.75}
                          />
                          <Text
                            style={[
                              styles.decisionBtnText,
                              { color: colors.error },
                            ]}
                          >
                            Reject
                          </Text>
                        </>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Quick Actions (Outreach Draft, Website) */}
            <View style={styles.actionsContainer}>
              {company.status !== "rejected" &&
              associatedEmail &&
              onViewEmail ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onViewEmail(associatedEmail)}
                  style={({ pressed }) => [
                    styles.primaryActionBtn,
                    {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primaryBorder,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.actionBtnLeft}>
                    <Mail
                      size={15}
                      color={colors.primary}
                      strokeWidth={1.75}
                    />
                    <Text
                      style={[
                        styles.primaryActionBtnText,
                        { color: colors.primary },
                      ]}
                      numberOfLines={1}
                    >
                      {associatedEmail.status === "replied"
                        ? `View Outreach & Replies (${associatedEmail.reply_count || 1})`
                        : associatedEmail.status === "sent"
                          ? "View Sent Outreach"
                          : "View Outreach Draft"}
                    </Text>
                  </View>
                  <ChevronRight
                    size={15}
                    color={colors.primary}
                    strokeWidth={1.75}
                  />
                </Pressable>
              ) : null}

              {company.website || company.domain ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={handleOpenWebsite}
                  style={({ pressed }) => [
                    styles.secondaryActionBtn,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.actionBtnLeft}>
                    <Globe
                      size={15}
                      color={colors.textSecondary}
                      strokeWidth={1.75}
                    />
                    <Text
                      style={[
                        styles.secondaryActionBtnText,
                        { color: colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      Visit Website
                    </Text>
                  </View>
                  <ExternalLink
                    size={14}
                    color={colors.textSecondary}
                    strokeWidth={1.75}
                  />
                </Pressable>
              ) : null}
            </View>

            {/* Company Basic Overview Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardSectionTitle, { color: colors.text }]}>
                Company Overview
              </Text>

              <View style={styles.attributesGrid}>
                {company.industry ? (
                  <View
                    style={[
                      styles.attributeItem,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.attributeLabelRow}>
                      <Briefcase
                        size={13}
                        color={colors.textSecondary}
                        strokeWidth={1.75}
                      />
                      <Text
                        style={[
                          styles.attributeLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Industry
                      </Text>
                    </View>
                    <Text
                      style={[styles.attributeValue, { color: colors.text }]}
                    >
                      {company.industry}
                    </Text>
                  </View>
                ) : null}

                {company.size ? (
                  <View
                    style={[
                      styles.attributeItem,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.attributeLabelRow}>
                      <Users
                        size={13}
                        color={colors.textSecondary}
                        strokeWidth={1.75}
                      />
                      <Text
                        style={[
                          styles.attributeLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Company Size
                      </Text>
                    </View>
                    <Text
                      style={[styles.attributeValue, { color: colors.text }]}
                    >
                      {company.size}
                    </Text>
                  </View>
                ) : null}

                {company.source ? (
                  <View
                    style={[
                      styles.attributeItem,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.attributeLabelRow}>
                      <Compass
                        size={13}
                        color={colors.textSecondary}
                        strokeWidth={1.75}
                      />
                      <Text
                        style={[
                          styles.attributeLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Discovery Source
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.attributeValue,
                        { color: colors.text, textTransform: "capitalize" },
                      ]}
                    >
                      {company.source}
                    </Text>
                  </View>
                ) : null}

                {formattedDate ? (
                  <View
                    style={[
                      styles.attributeItem,
                      { borderBottomColor: "transparent" },
                    ]}
                  >
                    <View style={styles.attributeLabelRow}>
                      <Clock
                        size={13}
                        color={colors.textSecondary}
                        strokeWidth={1.75}
                      />
                      <Text
                        style={[
                          styles.attributeLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Discovered Date
                      </Text>
                    </View>
                    <Text
                      style={[styles.attributeValue, { color: colors.text }]}
                    >
                      {formattedDate}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* SHOW DETAILS ACTION BUTTON */}
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowDetails((prev) => !prev)}
              style={({ pressed }) => [
                styles.showDetailsBtn,
                {
                  backgroundColor: showDetails
                    ? colors.primarySoft
                    : colors.surfaceElevated,
                  borderColor: showDetails
                    ? colors.primaryBorder
                    : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.showDetailsBtnLeft}>
                <View
                  style={[
                    styles.showDetailsIconWrap,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Activity
                    size={15}
                    color={showDetails ? colors.primary : colors.text}
                    strokeWidth={1.75}
                  />
                </View>
                <View style={styles.showDetailsTextWrap}>
                  <Text
                    style={[
                      styles.showDetailsBtnTitle,
                      { color: showDetails ? colors.primary : colors.text },
                    ]}
                  >
                    {showDetails
                      ? "Hide Detailed Intelligence"
                      : "Show Details & AI Intelligence"}
                  </Text>
                  <Text
                    style={[
                      styles.showDetailsBtnSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {showDetails
                      ? "Collapse deep company signals, hypothesis & tech gaps"
                      : "View why company needs you, needed skills, gaps & contacts"}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.chevronCircle,
                  {
                    backgroundColor: showDetails
                      ? colors.primary
                      : colors.surface,
                    borderColor: showDetails
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                {showDetails ? (
                  <ChevronUp
                    size={14}
                    color={colors.onPrimary}
                    strokeWidth={1.75}
                  />
                ) : (
                  <ChevronDown
                    size={14}
                    color={colors.textSecondary}
                    strokeWidth={1.75}
                  />
                )}
              </View>
            </Pressable>

            {/* DETAILED INTELLIGENCE SECTIONS */}
            {showDetails ? (
              <View style={styles.detailsContainer}>
                {/* 1. WHY THIS COMPANY NEEDS YOU */}
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Lightbulb
                        size={15}
                        color={colors.primary}
                        strokeWidth={1.75}
                      />
                      <Text
                        style={[styles.cardSectionTitle, { color: colors.text }]}
                      >
                        Why This Company Needs You
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.aiPill,
                        {
                          backgroundColor: colors.primarySoft,
                          borderColor: colors.primaryBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.aiPillText, { color: colors.primary }]}
                      >
                        AI Conclusion
                      </Text>
                    </View>
                  </View>

                  {needHypothesis ? (
                    <View
                      style={[
                        styles.hypothesisBox,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.hypothesisText, { color: colors.text }]}
                      >
                        {needHypothesis}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.emptyDetailText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Target prospect business has high compatibility with your
                      digital service capabilities.
                    </Text>
                  )}

                  {proposedSolution ? (
                    <View style={{ marginTop: tokens.spacing.sm }}>
                      <Text
                        style={[
                          styles.subSectionTitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Proposed Outreach Angle & Pitch:
                      </Text>
                      <Text
                        style={[styles.solutionText, { color: colors.text }]}
                      >
                        {proposedSolution}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* 2. NEEDED SKILLS & RECOMMENDED SERVICES */}
                {(neededSkills.length > 0 || neededServices.length > 0) && (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Zap
                          size={15}
                          color={colors.warning}
                          strokeWidth={1.75}
                        />
                        <Text
                          style={[
                            styles.cardSectionTitle,
                            { color: colors.text },
                          ]}
                        >
                          Skill & Service Opportunities
                        </Text>
                      </View>
                    </View>

                    {neededSkills.length > 0 && (
                      <View style={{ marginTop: tokens.spacing.xs }}>
                        <Text
                          style={[
                            styles.subSectionTitle,
                            { color: colors.textSecondary },
                          ]}
                        >
                          User Skills Required by Company:
                        </Text>
                        <View style={styles.tagWrap}>
                          {neededSkills.map((skill, idx) => (
                            <View
                              key={idx}
                              style={[
                                styles.skillTag,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: colors.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.skillTagText,
                                  { color: colors.text },
                                ]}
                              >
                                {skill}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {neededServices.length > 0 && (
                      <View style={{ marginTop: tokens.spacing.sm }}>
                        <Text
                          style={[
                            styles.subSectionTitle,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Specific Digital Services to Pitch:
                        </Text>
                        <View style={styles.bulletList}>
                          {neededServices.map((service, idx) => (
                            <View key={idx} style={styles.bulletItem}>
                              <CheckCircle2
                                size={13}
                                color={colors.success}
                                strokeWidth={1.75}
                              />
                              <Text
                                style={[
                                  styles.bulletText,
                                  { color: colors.text },
                                ]}
                              >
                                {service}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* 3. NEED SIGNALS & DIGITAL GAPS DETECTED */}
                {(needSignals.length > 0 || digitalFeatures.length > 0) && (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Target
                          size={15}
                          color={colors.primary}
                          strokeWidth={1.75}
                        />
                        <Text
                          style={[
                            styles.cardSectionTitle,
                            { color: colors.text },
                          ]}
                        >
                          Website Evidence & Digital Gaps
                        </Text>
                      </View>
                    </View>

                    {needSignals.length > 0 && (
                      <View style={{ marginTop: tokens.spacing.xs }}>
                        <Text
                          style={[
                            styles.subSectionTitle,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Concrete Website Signals:
                        </Text>
                        <View style={styles.bulletList}>
                          {needSignals.map((signal, idx) => (
                            <View key={idx} style={styles.bulletItem}>
                              <View
                                style={[
                                  styles.dotBullet,
                                  { backgroundColor: colors.primary },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.bulletText,
                                  { color: colors.text },
                                ]}
                              >
                                {signal}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {digitalFeatures.length > 0 && (
                      <View style={{ marginTop: tokens.spacing.sm }}>
                        <Text
                          style={[
                            styles.subSectionTitle,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Detected Stack Features & Deficiencies:
                        </Text>
                        <View style={styles.tagWrap}>
                          {digitalFeatures.map((feat, idx) => (
                            <View
                              key={idx}
                              style={[
                                styles.featureTag,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: colors.border,
                                },
                              ]}
                            >
                              <Cpu
                                size={11}
                                color={colors.textSecondary}
                                strokeWidth={1.75}
                              />
                              <Text
                                style={[
                                  styles.featureTagText,
                                  { color: colors.text },
                                ]}
                              >
                                {feat}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* 4. SERVICES OFFERED BY CLIENT COMPANY */}
                {servicesOffered.length > 0 && (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Layers
                          size={15}
                          color={colors.textSecondary}
                          strokeWidth={1.75}
                        />
                        <Text
                          style={[
                            styles.cardSectionTitle,
                            { color: colors.text },
                          ]}
                        >
                          Services Offered by Company
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.subSectionTitle,
                        { color: colors.textSecondary, marginTop: 4 },
                      ]}
                    >
                      Scraped from company /services page:
                    </Text>
                    <View style={styles.tagWrap}>
                      {servicesOffered.map((srv, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.servicePill,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.servicePillText,
                              { color: colors.text },
                            ]}
                          >
                            {srv}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 5. SCRAPED ABOUT TEXT */}
                {aboutText ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <FileText
                          size={15}
                          color={colors.textSecondary}
                          strokeWidth={1.75}
                        />
                        <Text
                          style={[
                            styles.cardSectionTitle,
                            { color: colors.text },
                          ]}
                        >
                          About the Company
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.aboutText,
                        { color: colors.textSecondary, marginTop: 4 },
                      ]}
                    >
                      {aboutText}
                    </Text>
                  </View>
                ) : null}

                {/* 6. AI AUTHENTICITY & QUALIFICATION */}
                {authScore !== undefined ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        {authScore >= 70 ? (
                          <ShieldCheck
                            size={15}
                            color={colors.success}
                            strokeWidth={1.75}
                          />
                        ) : (
                          <ShieldAlert
                            size={15}
                            color={colors.warning}
                            strokeWidth={1.75}
                          />
                        )}
                        <Text
                          style={[
                            styles.cardSectionTitle,
                            { color: colors.text },
                          ]}
                        >
                          Buyer Qualification & Fit
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View
                      style={[
                        styles.progressTrack,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${Math.min(Math.max(authScore, 5), 100)}%`,
                            backgroundColor:
                              authScore >= 70 ? colors.success : colors.warning,
                          },
                        ]}
                      />
                    </View>

                    {authFeedback ? (
                      <View
                        style={[
                          styles.feedbackBox,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.feedbackText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {authFeedback}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* 7. REACHER-VERIFIED CONTACTS */}
                {emails.length > 0 ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Mail
                          size={15}
                          color={colors.success}
                          strokeWidth={1.75}
                        />
                        <Text
                          style={[
                            styles.cardSectionTitle,
                            { color: colors.text },
                          ]}
                        >
                          Reacher-Verified Contacts ({emails.length})
                        </Text>
                      </View>
                    </View>

                    <View style={styles.contactList}>
                      {emails.map((contact, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.contactItem,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <View style={styles.contactHeader}>
                            <Text
                              style={[
                                styles.contactName,
                                { color: colors.text },
                              ]}
                            >
                              {contact.first_name || contact.last_name
                                ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
                                : contact.email_of || "Prospect Contact"}
                            </Text>
                            <View
                              style={[
                                styles.verifiedContactBadge,
                                {
                                  backgroundColor: colors.successSoft,
                                  borderColor: colors.successBorder,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.verifiedContactText,
                                  { color: colors.success },
                                ]}
                              >
                                {contact.is_verified ||
                                contact.is_reachable === "safe"
                                  ? "Reachable"
                                  : "Verified"}
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.contactEmail,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {contact.email}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheet: {
    maxHeight: "90%",
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
    ...tokens.shadow.lg,
  },
  handleRow: {
    alignItems: "center",
    paddingTop: tokens.spacing.sm,
    paddingBottom: 2,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: tokens.radius.full,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm + 4,
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  companyTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  companySubtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    paddingBottom: tokens.spacing.xl * 1.5,
  },
  statusHighlightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: tokens.spacing.sm + 2,
    paddingVertical: tokens.spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: tokens.radius.full,
  },
  statusBadgeText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  copyDomainButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: tokens.spacing.sm + 2,
    paddingVertical: tokens.spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
  },
  copyDomainText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  card: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    gap: tokens.spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
    flex: 1,
    flexShrink: 1,
  },
  cardSectionTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
    flexShrink: 1,
  },
  scorePill: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  scorePillText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  progressTrack: {
    height: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: tokens.radius.full,
  },
  feedbackBox: {
    padding: tokens.spacing.sm + 2,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    marginTop: 2,
  },
  feedbackText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  actionsContainer: {
    gap: tokens.spacing.sm,
  },
  primaryActionBtn: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  primaryActionBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  secondaryActionBtn: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  actionBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    flex: 1,
  },
  attributesGrid: {
    gap: 0,
  },
  attributeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
  },
  attributeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
  },
  attributeLabel: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  attributeValue: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  contactList: {
    gap: tokens.spacing.xs + 2,
  },
  contactItem: {
    padding: tokens.spacing.sm + 2,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: 2,
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contactName: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  verifiedContactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  verifiedContactText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 14,
  },
  contactEmail: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  decisionCard: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm + 2,
  },
  recipientSection: {
    gap: tokens.spacing.xs + 2,
    marginTop: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs,
  },
  recipientHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.sm,
  },
  recipientTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    flexShrink: 1,
  },
  recipientTitle: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  selectAllBtn: {
    paddingVertical: 2,
    paddingHorizontal: tokens.spacing.xs,
    flexShrink: 0,
  },
  selectAllBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  recipientList: {
    gap: tokens.spacing.xs,
  },
  recipientOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs + 2,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    gap: tokens.spacing.sm,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  recipientInfo: {
    flex: 1,
    minWidth: 0,
  },
  recipientEmailText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  recipientRoleText: {
    fontFamily: "DMSans",
    fontSize: 11,
    lineHeight: 14,
  },
  validationWarningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  validationWarningText: {
    fontFamily: "DMSans",
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  decisionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm + 2,
  },
  decisionHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  decisionHeaderTextWrap: {
    flex: 1,
  },
  decisionTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  decisionSubtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  decisionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    marginTop: 2,
  },
  acceptBtn: {
    flex: 1,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs + 2,
    borderRadius: tokens.radius.md,
  },
  rejectBtn: {
    flex: 1,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs + 2,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  decisionBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  scoreQuickBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm + 2,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  scoreQuickLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  scoreQuickLabel: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  showDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm + 4,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
  },
  showDetailsBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm + 2,
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  showDetailsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  showDetailsTextWrap: {
    flex: 1,
  },
  showDetailsBtnTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  showDetailsBtnSubtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  chevronCircle: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsContainer: {
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.xs,
  },
  aiPill: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiPillText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  hypothesisBox: {
    padding: tokens.spacing.sm + 4,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    marginTop: 2,
  },
  hypothesisText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  emptyDetailText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  subSectionTitle: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
    marginBottom: tokens.spacing.xs + 2,
  },
  solutionText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs + 2,
  },
  skillTag: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  skillTagText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  bulletList: {
    gap: tokens.spacing.xs + 2,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.spacing.sm,
  },
  dotBullet: {
    width: 5,
    height: 5,
    borderRadius: tokens.radius.full,
    marginTop: 7,
  },
  bulletText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
    flex: 1,
  },
  featureTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  featureTagText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  servicePill: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  servicePillText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  aboutText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
});
