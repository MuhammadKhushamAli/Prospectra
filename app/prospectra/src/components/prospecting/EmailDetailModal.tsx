import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import type { EmailDetailModalProps } from "../../types/prospecting";

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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  if (!email) return null;

  const handleSend = async () => {
    if (
      !onSendEmail ||
      isSending ||
      isRegenerating ||
      email.status === "sent"
    )
      return;
    try {
      setIsSending(true);
      await onSendEmail(email);
      setActionMessage("Outreach email sent successfully!");
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setIsSending(false);
    }
  };

  const handleRegenerate = () => {
    if (
      !onRegenerateEmail ||
      isSending ||
      isRegenerating ||
      email.status === "sent"
    )
      return;
    setShowFeedbackModal(true);
  };

  const submitRegeneration = async (customFeedback?: string) => {
    if (
      !onRegenerateEmail ||
      isSending ||
      isRegenerating ||
      email.status === "sent"
    )
      return;
    try {
      setIsRegenerating(true);
      setShowFeedbackModal(false);
      await onRegenerateEmail(email, customFeedback);
      setActionMessage(
        customFeedback?.trim()
          ? "AI draft regenerated with your feedback!"
          : "AI draft regenerated with fresh pitch!",
      );
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setIsRegenerating(false);
      setFeedbackText("");
    }
  };

  const subjectText =
    email.email_body?.subject || email.subject || "No Subject";
  const bodyText =
    email.email_body?.body || email.body || "No email body content available.";

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

  const getStatusSoft = () => {
    if (email.status === "rejected") return colors.errorSoft;
    if (email.status === "draft") return colors.warningSoft;
    return colors.successSoft;
  };

  const getStatusBorder = () => {
    if (email.status === "rejected") return colors.errorBorder;
    if (email.status === "draft") return colors.warningBorder;
    return colors.successBorder;
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
  const statusSoft = getStatusSoft();
  const statusBorder = getStatusBorder();
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
                <Mail size={18} color={colors.text} strokeWidth={1.75} />
              </View>
              <View style={styles.headerTextWrap}>
                <Text
                  style={[styles.emailTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {email.company_name || "Target Outreach"}
                </Text>
                <Text
                  style={[
                    styles.emailSubtitle,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  AI Outreach Draft Details
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
            {/* Status & Recipient Summary */}
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

              {formattedDate ? (
                <View style={styles.dateRow}>
                  <Clock
                    size={12}
                    color={colors.textSecondary}
                    strokeWidth={1.75}
                  />
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
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    {verificationScore >= 70 ? (
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
                    High persona relevance and authentic tone calibrated for
                    outreach.
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
                  Subject Line
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleCopySubject}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.copyBtn,
                    {
                      backgroundColor: copiedSubject
                        ? colors.successSoft
                        : colors.surface,
                      borderColor: copiedSubject
                        ? colors.successBorder
                        : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  {copiedSubject ? (
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
                      styles.copyBtnText,
                      {
                        color: copiedSubject
                          ? colors.success
                          : colors.textSecondary,
                      },
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
                  accessibilityRole="button"
                  onPress={handleCopyBody}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.copyBtn,
                    {
                      backgroundColor: copiedBody
                        ? colors.successSoft
                        : colors.surface,
                      borderColor: copiedBody
                        ? colors.successBorder
                        : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  {copiedBody ? (
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
                      styles.copyBtnText,
                      {
                        color: copiedBody
                          ? colors.success
                          : colors.textSecondary,
                      },
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
                      backgroundColor: colors.successSoft,
                      borderColor: colors.successBorder,
                    },
                  ]}
                >
                  <Check size={14} color={colors.success} strokeWidth={1.75} />
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
                        backgroundColor: colors.successSoft,
                        borderColor: colors.successBorder,
                      },
                    ]}
                  >
                    <Check
                      size={15}
                      color={colors.success}
                      strokeWidth={1.75}
                    />
                    <Text
                      style={[styles.sentBadgeText, { color: colors.success }]}
                    >
                      Outreach Email Sent
                    </Text>
                  </View>
                ) : onSendEmail ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleSend}
                    disabled={isSending || isRegenerating}
                    style={({ pressed }) => [
                      styles.sendActionBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity:
                          pressed || isSending || isRegenerating ? 0.85 : 1,
                      },
                    ]}
                  >
                    {isSending ? (
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                      <>
                        <Send
                          size={14}
                          color={colors.onPrimary}
                          strokeWidth={1.75}
                        />
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

                {onRegenerateEmail && email.status !== "sent" ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleRegenerate}
                    disabled={isSending || isRegenerating}
                    style={({ pressed }) => [
                      styles.regenerateActionBtn,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                        opacity:
                          pressed || isSending || isRegenerating ? 0.75 : 1,
                      },
                    ]}
                  >
                    {isRegenerating ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <>
                        <RefreshCw
                          size={14}
                          color={colors.text}
                          strokeWidth={1.75}
                        />
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
                accessibilityRole="button"
                onPress={() => onViewCompany(associatedCompany)}
                style={({ pressed }) => [
                  styles.companyLinkCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.companyLinkLeft}>
                  <Building2
                    size={16}
                    color={colors.textSecondary}
                    strokeWidth={1.75}
                  />
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
                      style={[styles.companyLinkName, { color: colors.text }]}
                    >
                      {associatedCompany.name} (
                      {associatedCompany.domain || "View Details"})
                    </Text>
                  </View>
                </View>
                <ChevronRight
                  size={15}
                  color={colors.textSecondary}
                  strokeWidth={1.75}
                />
              </Pressable>
            ) : null}
          </ScrollView>

          {/* Feedback Modal for Regenerating Email */}
          <Modal
            visible={showFeedbackModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowFeedbackModal(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.feedbackModalOverlay}
            >
              <Pressable
                style={styles.feedbackModalBackdrop}
                onPress={() => setShowFeedbackModal(false)}
              />
              <View
                style={[
                  styles.feedbackModalCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.feedbackModalHeader}>
                  <View style={styles.feedbackHeaderTitleRow}>
                    <View
                      style={[
                        styles.feedbackIconBadge,
                        { backgroundColor: `${colors.primary}18` },
                      ]}
                    >
                      <Sparkles
                        size={16}
                        color={colors.primary}
                        strokeWidth={2}
                      />
                    </View>
                    <Text
                      style={[
                        styles.feedbackModalTitle,
                        { color: colors.text },
                      ]}
                    >
                      Regenerate with Feedback
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setShowFeedbackModal(false)}
                    hitSlop={8}
                  >
                    <X size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <Text
                  style={[
                    styles.feedbackModalSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Guide the AI to tailor this draft for{" "}
                  {associatedCompany?.name || email.company_name || "the target company"}.
                </Text>

                {/* Quick Feedback Chips */}
                <View style={styles.feedbackChipsRow}>
                  {[
                    "Make it shorter",
                    "More technical",
                    "Emphasize skills",
                    "Add direct CTA",
                  ].map((chip) => (
                    <Pressable
                      key={chip}
                      onPress={() => {
                        setFeedbackText((prev) =>
                          prev ? `${prev}, ${chip.toLowerCase()}` : chip,
                        );
                      }}
                      style={({ pressed }) => [
                        styles.feedbackChip,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.feedbackChipText,
                          { color: colors.textMuted },
                        ]}
                      >
                        + {chip}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Feedback Input Field */}
                <TextInput
                  style={[
                    styles.feedbackInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  multiline
                  numberOfLines={3}
                  placeholder="e.g. Focus on our high-scale API experience and keep it under 100 words..."
                  placeholderTextColor={colors.textMuted}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  textAlignVertical="top"
                />

                {/* Action Buttons */}
                <View style={styles.feedbackActionsRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setShowFeedbackModal(false)}
                    style={({ pressed }) => [
                      styles.feedbackCancelBtn,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.feedbackCancelBtnText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => submitRegeneration(feedbackText)}
                    disabled={isRegenerating}
                    style={({ pressed }) => [
                      styles.feedbackSubmitBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: pressed || isRegenerating ? 0.85 : 1,
                      },
                    ]}
                  >
                    {isRegenerating ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.onPrimary}
                      />
                    ) : (
                      <>
                        <RefreshCw
                          size={14}
                          color={colors.onPrimary}
                          strokeWidth={2}
                        />
                        <Text
                          style={[
                            styles.feedbackSubmitBtnText,
                            { color: colors.onPrimary },
                          ]}
                        >
                          {feedbackText.trim()
                            ? "Regenerate with Feedback"
                            : "Regenerate Draft"}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
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
  emailTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  emailSubtitle: {
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
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  dateText: {
    fontFamily: "DMSans",
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
  feedbackNotice: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  copyBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  subjectValueText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  bodyContainer: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
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
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
  },
  companyLinkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm + 2,
    flex: 1,
  },
  companyLinkTextWrap: {
    flex: 1,
  },
  companyLinkLabel: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  companyLinkName: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: tokens.spacing.sm,
  },
  actionFeedbackBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  actionFeedbackText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  sentBadge: {
    flex: 1,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs + 2,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  sentBadgeText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  sendActionBtn: {
    flex: 1,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs + 2,
    borderRadius: tokens.radius.md,
    ...tokens.shadow.sm,
  },
  sendActionBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  regenerateActionBtn: {
    flex: 1,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs + 2,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  regenerateActionBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  feedbackModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.spacing.md,
  },
  feedbackModalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  feedbackModalCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    padding: tokens.spacing.lg,
    ...tokens.shadow.md,
  },
  feedbackModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: tokens.spacing.xs,
  },
  feedbackHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
  },
  feedbackIconBadge: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackModalTitle: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.md,
    lineHeight: 22,
  },
  feedbackModalSubtitle: {
    fontFamily: "DMSansRegular",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
    marginBottom: tokens.spacing.sm,
  },
  feedbackChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.sm,
  },
  feedbackChip: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs - 2,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  feedbackChipText: {
    fontFamily: "DMSansMedium",
    fontSize: 11,
    lineHeight: 14,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    fontFamily: "DMSansRegular",
    fontSize: tokens.fontSize.sm,
    minHeight: 80,
    marginBottom: tokens.spacing.md,
  },
  feedbackActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  feedbackCancelBtn: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  feedbackCancelBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
  feedbackSubmitBtn: {
    flex: 2,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs,
    borderRadius: tokens.radius.md,
    ...tokens.shadow.sm,
  },
  feedbackSubmitBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
});
