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
import * as Clipboard from "expo-clipboard";
import {
  Building2,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Mail,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import type {
  CompanyProspect,
  EmailProspect,
} from "../../types/prospecting";

interface EmailDetailModalProps {
  email: EmailProspect | null;
  visible: boolean;
  onClose: () => void;
  onViewCompany?: (company: CompanyProspect) => void;
  associatedCompany?: CompanyProspect | null;
  onSendEmail?: (email: EmailProspect) => void | Promise<void>;
  onRegenerateEmail?: (email: EmailProspect) => void | Promise<void>;
}

export default function EmailDetailModal({
  email,
  visible,
  onClose,
  onViewCompany,
  associatedCompany,
  onSendEmail,
  onRegenerateEmail,
}: EmailDetailModalProps) {
  const colors = useTheme();
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (!email) return null;

  const handleSend = async () => {
    if (!onSendEmail || isSending || isRegenerating || email.status === "sent") return;
    try {
      setIsSending(true);
      await onSendEmail(email);
      setActionMessage("Outreach email sent successfully!");
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setIsSending(false);
    }
  };

  const handleRegenerate = async () => {
    if (!onRegenerateEmail || isSending || isRegenerating) return;
    try {
      setIsRegenerating(true);
      await onRegenerateEmail(email);
      setActionMessage("AI draft regenerated with fresh pitch!");
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setIsRegenerating(false);
    }
  };

  const subjectText = email.email_body?.subject || email.subject || "No Subject";
  const bodyText = email.email_body?.body || email.body || "No email body content available.";

  const handleCopySubject = async () => {
    await Clipboard.setStringAsync(subjectText);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleCopyBody = async () => {
    await Clipboard.setStringAsync(bodyText);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const getStatusColor = () => {
    if (email.status === "rejected") return colors.error;
    if (email.status === "draft") return colors.warning;
    return colors.success;
  };

  const getStatusLabel = () => {
    if (email.status === "draft") return "Pending Draft";
    if (email.status === "rejected") return "Rejected";
    if (email.status === "approved") return "Approved";
    if (email.status === "sent") return "Sent";
    if (email.status === "replied") return "Replied";
    return "Outreach Draft";
  };

  const statusColor = getStatusColor();
  const verificationScore = email.verification?.score;
  const verificationFeedback = email.verification?.feedback;

  const formattedDate = email.created_at
    ? new Date(email.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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
                <Mail size={20} color={colors.primary} />
              </View>
              <View style={styles.headerTextWrap}>
                <Text
                  style={[styles.emailTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {email.company_name || "Target Outreach"}
                </Text>
                <Text
                  style={[styles.emailSubtitle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  Outreach Draft Details
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
            {/* Status & Recipient Summary */}
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

              {formattedDate ? (
                <View style={styles.dateRow}>
                  <Clock size={12} color={colors.textSecondary} />
                  <Text
                    style={[styles.dateText, { color: colors.textSecondary }]}
                  >
                    {formattedDate}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* AI Agent Verification Evaluation Card */}
            {verificationScore !== undefined ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor:
                      verificationScore >= 70
                        ? colors.border
                        : `${colors.warning}60`,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    {verificationScore >= 70 ? (
                      <ShieldCheck size={16} color={colors.success} />
                    ) : (
                      <ShieldAlert size={16} color={colors.warning} />
                    )}
                    <Text
                      style={[
                        styles.cardSectionTitle,
                        { color: colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      Agent Verification & Quality
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.scorePill,
                      {
                        backgroundColor:
                          verificationScore >= 70
                            ? `${colors.success}20`
                            : `${colors.warning}20`,
                        borderColor:
                          verificationScore >= 70
                            ? colors.success
                            : colors.warning,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scorePillText,
                        {
                          color:
                            verificationScore >= 70
                              ? colors.success
                              : colors.warning,
                        },
                      ]}
                    >
                      {verificationScore}% Quality
                    </Text>
                  </View>
                </View>

                {/* Score Progress Bar */}
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(Math.max(verificationScore, 5), 100)}%`,
                        backgroundColor:
                          verificationScore >= 70
                            ? colors.success
                            : colors.warning,
                      },
                    ]}
                  />
                </View>

                {verificationFeedback ? (
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
                      {verificationFeedback}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.feedbackNotice,
                      { color: colors.textSecondary },
                    ]}
                  >
                    High persona relevance and authentic tone calibrated for outreach.
                  </Text>
                )}
              </View>
            ) : null}

            {/* Email Subject Section */}
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
                <Text style={[styles.cardSectionTitle, { color: colors.text }]}>
                  Subject
                </Text>
                <Pressable
                  onPress={handleCopySubject}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.copyBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  {copiedSubject ? (
                    <Check size={12} color={colors.success} />
                  ) : (
                    <Copy size={12} color={colors.textSecondary} />
                  )}
                  <Text
                    style={[
                      styles.copyBtnText,
                      { color: copiedSubject ? colors.success : colors.textSecondary },
                    ]}
                  >
                    {copiedSubject ? "Copied" : "Copy"}
                  </Text>
                </Pressable>
              </View>
              <Text
                style={[styles.subjectValueText, { color: colors.text }]}
                selectable
              >
                {subjectText}
              </Text>
            </View>

            {/* Email Body Section */}
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
                <Text style={[styles.cardSectionTitle, { color: colors.text }]}>
                  Email Body
                </Text>
                <Pressable
                  onPress={handleCopyBody}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.copyBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  {copiedBody ? (
                    <Check size={12} color={colors.success} />
                  ) : (
                    <Copy size={12} color={colors.textSecondary} />
                  )}
                  <Text
                    style={[
                      styles.copyBtnText,
                      { color: copiedBody ? colors.success : colors.textSecondary },
                    ]}
                  >
                    {copiedBody ? "Copied" : "Copy Body"}
                  </Text>
                </Pressable>
              </View>
              <View
                style={[
                  styles.bodyContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.bodyText, { color: colors.text }]}
                  selectable
                >
                  {bodyText}
                </Text>
              </View>
            </View>

            {/* Email Actions: Send Outreach & Regenerate Draft */}
            <View style={styles.actionsContainer}>
              {actionMessage ? (
                <View
                  style={[
                    styles.actionFeedbackBox,
                    {
                      backgroundColor: `${colors.success}18`,
                      borderColor: colors.success,
                    },
                  ]}
                >
                  <Check size={14} color={colors.success} />
                  <Text
                    style={[
                      styles.actionFeedbackText,
                      { color: colors.success },
                    ]}
                  >
                    {actionMessage}
                  </Text>
                </View>
              ) : null}

              <View style={styles.actionButtonsRow}>
                {email.status === "sent" ? (
                  <View
                    style={[
                      styles.sentBadge,
                      {
                        backgroundColor: `${colors.success}18`,
                        borderColor: colors.success,
                      },
                    ]}
                  >
                    <Check size={16} color={colors.success} />
                    <Text
                      style={[
                        styles.sentBadgeText,
                        { color: colors.success },
                      ]}
                    >
                      Outreach Email Sent
                    </Text>
                  </View>
                ) : onSendEmail ? (
                  <Pressable
                    onPress={handleSend}
                    disabled={isSending || isRegenerating}
                    style={({ pressed }) => [
                      styles.sendActionBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: pressed || isSending || isRegenerating ? 0.8 : 1,
                      },
                    ]}
                  >
                    {isSending ? (
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                      <>
                        <Send size={15} color={colors.onPrimary} />
                        <Text
                          style={[
                            styles.sendActionBtnText,
                            { color: colors.onPrimary },
                          ]}
                        >
                          Send Email
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : null}

                {onRegenerateEmail ? (
                  <Pressable
                    onPress={handleRegenerate}
                    disabled={isSending || isRegenerating}
                    style={({ pressed }) => [
                      styles.regenerateActionBtn,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                        opacity: pressed || isSending || isRegenerating ? 0.75 : 1,
                      },
                    ]}
                  >
                    {isRegenerating ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Sparkles size={15} color={colors.primary} />
                        <Text
                          style={[
                            styles.regenerateActionBtnText,
                            { color: colors.text },
                          ]}
                        >
                          Regenerate Draft
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Associated Company Link */}
            {associatedCompany && onViewCompany ? (
              <Pressable
                onPress={() => onViewCompany(associatedCompany)}
                style={({ pressed }) => [
                  styles.companyLinkCard,
                  {
                    backgroundColor: `${colors.primary}12`,
                    borderColor: colors.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.companyLinkLeft}>
                  <Building2 size={18} color={colors.primary} />
                  <View style={styles.companyLinkTextWrap}>
                    <Text
                      style={[
                        styles.companyLinkLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Associated Company
                    </Text>
                    <Text
                      style={[
                        styles.companyLinkName,
                        { color: colors.primary },
                      ]}
                    >
                      {associatedCompany.name} ({associatedCompany.domain || "View Details"})
                    </Text>
                  </View>
                </View>
                <ChevronRight size={16} color={colors.primary} />
              </Pressable>
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
  emailTitle: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.md,
  },
  emailSubtitle: {
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
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dateText: {
    fontFamily: "DMSans",
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

  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  copyBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: 11,
  },
  subjectValueText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  bodyContainer: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  bodyText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 22,
  },
  companyLinkCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  companyLinkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    flex: 1,
  },
  companyLinkTextWrap: {
    flex: 1,
  },
  companyLinkLabel: {
    fontFamily: "DMSans",
    fontSize: 11,
  },
  companyLinkName: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.xs,
    marginTop: 2,
  },
  actionsContainer: {
    gap: tokens.spacing.sm,
  },
  actionFeedbackBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  actionFeedbackText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  sentBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  sentBadgeText: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.xs,
  },
  sendActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: tokens.radius.md,
  },
  sendActionBtnText: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.xs,
  },
  regenerateActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  regenerateActionBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
});
