import { useState } from "react";
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
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
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
  Sparkles,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import type {
  CompanyDetailModalProps,
} from "../../types/prospecting";

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

  if (!company) return null;

  const isPending =
    company.status === "pending_review" ||
    company.status === "discovered" ||
    company.status === "enriched" ||
    company.status === "pending_send_approval";

  const handleAccept = async () => {
    if (!onAcceptCompany || isAccepting || isRejecting) return;
    try {
      setIsAccepting(true);
      await onAcceptCompany(company);
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
    const url = company.website || (company.domain ? `https://${company.domain}` : null);
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const getStatusColor = () => {
    if (company.status === "rejected") return colors.error;
    if (
      company.status === "pending_review" ||
      company.status === "discovered" ||
      company.status === "enriched" ||
      company.status === "pending_send_approval"
    ) {
      return colors.warning;
    }
    return colors.success;
  };

  const getStatusLabel = () => {
    if (company.status === "rejected") return "Rejected";
    if (company.status === "pending_review") return "Pending Review";
    if (company.status === "discovered") return "Pending Discovery";
    if (company.status === "enriched") return "Pending Review";
    if (company.status === "pending_send_approval") return "Pending Send";
    if (company.status === "approved") return "Approved";
    return company.status.toUpperCase();
  };

  const statusColor = getStatusColor();
  const authScore = company.auth_score ?? company.company_auth?.score;
  const authFeedback = company.auth_feedback || company.company_auth?.feedback;
  const userSkills = company.company_auth?.user_skills || [];
  const targetIndustries = company.company_auth?.target_industries || [];

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
          {/* Sheet Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: `${colors.primary}18`,
                    borderColor: `${colors.primary}40`,
                  },
                ]}
              >
                <Building2 size={20} color={colors.primary} />
              </View>
              <View style={styles.headerTextWrap}>
                <Text
                  style={[styles.companyTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {company.name}
                </Text>
                <Text
                  style={[styles.companySubtitle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  Company Prospect Details
                </Text>
              </View>
            </View>

            <Pressable
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
              <X size={18} color={colors.textSecondary} />
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
                    backgroundColor: `${statusColor}20`,
                    borderColor: statusColor,
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
                  onPress={handleCopyDomain}
                  style={({ pressed }) => [
                    styles.copyDomainButton,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  {copiedDomain ? (
                    <Check size={13} color={colors.success} />
                  ) : (
                    <Copy size={13} color={colors.textSecondary} />
                  )}
                  <Text
                    style={[
                      styles.copyDomainText,
                      { color: copiedDomain ? colors.success : colors.textSecondary },
                    ]}
                  >
                    {copiedDomain ? "Copied" : company.domain}
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
                  <ShieldCheck size={16} color={authScore >= 70 ? colors.success : colors.warning} />
                  <Text style={[styles.scoreQuickLabel, { color: colors.text }]}>
                    AI Buyer Match Score
                  </Text>
                </View>
                <View
                  style={[
                    styles.scorePill,
                    {
                      backgroundColor:
                        authScore >= 70
                          ? `${colors.success}20`
                          : `${colors.warning}20`,
                      borderColor:
                        authScore >= 70 ? colors.success : colors.warning,
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

            {/* Review Decision: Accept or Reject (only visible for pending companies) */}
            {isPending && (onAcceptCompany || onRejectCompany) ? (
              <View
                style={[
                  styles.card,
                  styles.decisionCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: `${colors.primary}50`,
                  },
                ]}
              >
                <View style={styles.decisionHeader}>
                  <View
                    style={[
                      styles.decisionHeaderIcon,
                      {
                        backgroundColor: `${colors.primary}18`,
                        borderColor: `${colors.primary}30`,
                      },
                    ]}
                  >
                    <Sparkles size={16} color={colors.primary} />
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
                      Accepting approves this prospect and enables outreach drafting.
                    </Text>
                  </View>
                </View>

                <View style={styles.decisionButtonsRow}>
                  {onAcceptCompany ? (
                    <Pressable
                      onPress={handleAccept}
                      disabled={isAccepting || isRejecting}
                      style={({ pressed }) => [
                        styles.acceptBtn,
                        {
                          backgroundColor: colors.success,
                          opacity: pressed || isAccepting || isRejecting ? 0.8 : 1,
                        },
                      ]}
                    >
                      {isAccepting ? (
                        <ActivityIndicator size="small" color={colors.onPrimary} />
                      ) : (
                        <>
                          <Check size={16} color={colors.onPrimary} />
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
                      onPress={handleReject}
                      disabled={isAccepting || isRejecting}
                      style={({ pressed }) => [
                        styles.rejectBtn,
                        {
                          backgroundColor: `${colors.error}15`,
                          borderColor: colors.error,
                          opacity: pressed || isAccepting || isRejecting ? 0.8 : 1,
                        },
                      ]}
                    >
                      {isRejecting ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <>
                          <X size={16} color={colors.error} />
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

            {/* Quick Actions (Outreach Draft only for approved companies, Website) */}
            <View style={styles.actionsContainer}>
              {company.status === "approved" && associatedEmail && onViewEmail ? (
                <Pressable
                  onPress={() => onViewEmail(associatedEmail)}
                  style={({ pressed }) => [
                    styles.primaryActionBtn,
                    {
                      backgroundColor: `${colors.primary}18`,
                      borderColor: colors.primary,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <View style={styles.actionBtnLeft}>
                    <Mail size={16} color={colors.primary} />
                    <Text
                      style={[
                        styles.primaryActionBtnText,
                        { color: colors.primary },
                      ]}
                      numberOfLines={1}
                    >
                      View Outreach Draft
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.primary} />
                </Pressable>
              ) : null}

              {company.website || company.domain ? (
                <Pressable
                  onPress={handleOpenWebsite}
                  style={({ pressed }) => [
                    styles.secondaryActionBtn,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <View style={styles.actionBtnLeft}>
                    <Globe size={15} color={colors.textSecondary} />
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
                  <ExternalLink size={14} color={colors.textSecondary} />
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
                  <View style={styles.attributeItem}>
                    <View style={styles.attributeLabelRow}>
                      <Briefcase size={13} color={colors.textSecondary} />
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
                  <View style={styles.attributeItem}>
                    <View style={styles.attributeLabelRow}>
                      <Users size={13} color={colors.textSecondary} />
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
                  <View style={styles.attributeItem}>
                    <View style={styles.attributeLabelRow}>
                      <Sparkles size={13} color={colors.textSecondary} />
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
                  <View style={styles.attributeItem}>
                    <View style={styles.attributeLabelRow}>
                      <Clock size={13} color={colors.textSecondary} />
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

            {/* ======================================================== */}
            {/* SHOW DETAILS ACTION BUTTON */}
            {/* ======================================================== */}
            <Pressable
              onPress={() => setShowDetails((prev) => !prev)}
              style={({ pressed }) => [
                styles.showDetailsBtn,
                {
                  backgroundColor: showDetails
                    ? `${colors.primary}18`
                    : colors.surfaceElevated,
                  borderColor: showDetails ? colors.primary : `${colors.primary}50`,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={styles.showDetailsBtnLeft}>
                <View
                  style={[
                    styles.showDetailsIconWrap,
                    {
                      backgroundColor: `${colors.primary}20`,
                      borderColor: `${colors.primary}40`,
                    },
                  ]}
                >
                  <Sparkles size={16} color={colors.primary} />
                </View>
                <View style={styles.showDetailsTextWrap}>
                  <Text
                    style={[
                      styles.showDetailsBtnTitle,
                      { color: colors.primary },
                    ]}
                  >
                    {showDetails ? "Hide Detailed Intelligence" : "Show Details & AI Intelligence"}
                  </Text>
                  <Text
                    style={[
                      styles.showDetailsBtnSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {showDetails
                      ? "Collapse deep company signals, hypothesis & tech gaps"
                      : "Click to view why company needs you, needed skills, gaps & contacts"}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.chevronCircle,
                  {
                    backgroundColor: showDetails
                      ? colors.primary
                      : `${colors.primary}18`,
                  },
                ]}
              >
                {showDetails ? (
                  <ChevronUp size={15} color={colors.onPrimary} />
                ) : (
                  <ChevronDown size={15} color={colors.primary} />
                )}
              </View>
            </Pressable>

            {/* ======================================================== */}
            {/* DETAILED INTELLIGENCE SECTIONS (Revealed on click) */}
            {/* ======================================================== */}
            {showDetails ? (
              <View style={styles.detailsContainer}>
                {/* 1. WHY THIS COMPANY NEEDS YOU (NEED HYPOTHESIS) */}
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: `${colors.primary}45`,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Lightbulb size={16} color={colors.primary} />
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
                          backgroundColor: `${colors.primary}18`,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text style={[styles.aiPillText, { color: colors.primary }]}>
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
                          borderColor: `${colors.primary}30`,
                        },
                      ]}
                    >
                      <Text style={[styles.hypothesisText, { color: colors.text }]}>
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
                      Target prospect business has high compatibility with your digital service capabilities.
                    </Text>
                  )}

                  {proposedSolution ? (
                    <View style={{ marginTop: 8 }}>
                      <Text
                        style={[
                          styles.subSectionTitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Proposed Outreach Angle & Pitch:
                      </Text>
                      <Text style={[styles.solutionText, { color: colors.text }]}>
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
                        <Zap size={16} color={colors.warning} />
                        <Text
                          style={[styles.cardSectionTitle, { color: colors.text }]}
                        >
                          Skill & Service Opportunities
                        </Text>
                      </View>
                    </View>

                    {neededSkills.length > 0 && (
                      <View style={{ marginTop: 4 }}>
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
                                  backgroundColor: `${colors.primary}18`,
                                  borderColor: `${colors.primary}40`,
                                },
                              ]}
                            >
                              <Text
                                style={[styles.skillTagText, { color: colors.primary }]}
                              >
                                {skill}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {neededServices.length > 0 && (
                      <View style={{ marginTop: 10 }}>
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
                              <CheckCircle2 size={13} color={colors.success} />
                              <Text
                                style={[styles.bulletText, { color: colors.text }]}
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
                        <Target size={16} color={colors.secondary} />
                        <Text
                          style={[styles.cardSectionTitle, { color: colors.text }]}
                        >
                          Website Evidence & Digital Gaps
                        </Text>
                      </View>
                    </View>

                    {needSignals.length > 0 && (
                      <View style={{ marginTop: 4 }}>
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
                                  { backgroundColor: colors.secondary },
                                ]}
                              />
                              <Text
                                style={[styles.bulletText, { color: colors.text }]}
                              >
                                {signal}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {digitalFeatures.length > 0 && (
                      <View style={{ marginTop: 10 }}>
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
                              <Cpu size={11} color={colors.textSecondary} />
                              <Text
                                style={[
                                  styles.featureTagText,
                                  { color: colors.textSecondary },
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
                        <Layers size={16} color={colors.textSecondary} />
                        <Text
                          style={[styles.cardSectionTitle, { color: colors.text }]}
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
                        <FileText size={16} color={colors.textSecondary} />
                        <Text
                          style={[styles.cardSectionTitle, { color: colors.text }]}
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
                        borderColor:
                          authScore >= 70 ? colors.border : `${colors.warning}60`,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        {authScore >= 70 ? (
                          <ShieldCheck size={16} color={colors.success} />
                        ) : (
                          <ShieldAlert size={16} color={colors.warning} />
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
                        <Mail size={16} color={colors.primary} />
                        <Text
                          style={[styles.cardSectionTitle, { color: colors.text }]}
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
                              style={[styles.contactName, { color: colors.text }]}
                            >
                              {contact.first_name || contact.last_name
                                ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
                                : contact.email_of || "Prospect Contact"}
                            </Text>
                            <View
                              style={[
                                styles.verifiedContactBadge,
                                {
                                  backgroundColor: `${colors.success}18`,
                                  borderColor: colors.success,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.verifiedContactText,
                                  { color: colors.success },
                                ]}
                              >
                                {contact.is_verified || contact.is_reachable === "safe"
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
    maxHeight: "88%",
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
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
    gap: tokens.spacing.sm,
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  companyTitle: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.md,
  },
  companySubtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    marginTop: 1,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: tokens.radius.full,
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
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 5,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: tokens.radius.full,
  },
  statusBadgeText: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.xs,
    letterSpacing: 0.3,
  },
  copyDomainButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 5,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  copyDomainText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
  card: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
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
    gap: 6,
    flex: 1,
    flexShrink: 1,
  },
  cardSectionTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
    flexShrink: 1,
  },
  scorePill: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  scorePillText: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.xs,
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
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    marginTop: 2,
  },
  feedbackText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  feedbackNotice: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  actionsContainer: {
    gap: tokens.spacing.sm,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  primaryActionBtnText: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.sm,
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
  },
  actionBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  attributesGrid: {
    gap: tokens.spacing.sm,
  },
  attributeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150, 150, 150, 0.15)",
  },
  attributeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attributeLabel: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
  },
  attributeValue: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
  contactList: {
    gap: tokens.spacing.xs,
  },
  contactItem: {
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    gap: 2,
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contactName: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xs,
  },
  verifiedContactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  verifiedContactText: {
    fontFamily: "DMSansBold",
    fontSize: 10,
  },
  contactEmail: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
  },
  decisionCard: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  decisionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
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
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.sm,
  },
  decisionSubtitle: {
    fontFamily: "DMSans",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  decisionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    marginTop: 4,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: tokens.radius.md,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  decisionBtnText: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.xs,
  },
  scoreQuickBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 10,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  scoreQuickLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scoreQuickLabel: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xs,
  },
  showDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 12,
    borderRadius: tokens.radius.md,
    borderWidth: 1.5,
  },
  showDetailsBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
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
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.sm,
  },
  showDetailsBtnSubtitle: {
    fontFamily: "DMSans",
    fontSize: 11,
    marginTop: 1,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsContainer: {
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.xs,
  },
  aiPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  aiPillText: {
    fontFamily: "DMSansBold",
    fontSize: 10,
  },
  hypothesisBox: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    marginTop: 4,
  },
  hypothesisText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  emptyDetailText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    fontStyle: "italic",
    marginTop: 4,
  },
  subSectionTitle: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    marginBottom: 6,
  },
  solutionText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  skillTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  skillTagText: {
    fontFamily: "DMSansBold",
    fontSize: 11,
  },
  bulletList: {
    gap: 6,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  dotBullet: {
    width: 6,
    height: 6,
    borderRadius: tokens.radius.full,
    marginTop: 6,
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
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  featureTagText: {
    fontFamily: "DMSansMedium",
    fontSize: 11,
  },
  servicePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  servicePillText: {
    fontFamily: "DMSansMedium",
    fontSize: 11,
  },
  aboutText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
});
