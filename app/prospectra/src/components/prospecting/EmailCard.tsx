import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Globe, Mail, MessageSquare } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import {
  getEmailStatusBorder,
  getEmailStatusColor,
  getEmailStatusSoftBg,
} from "../../helpers/prospecting/prospectingStatusHelpers";
import type { EmailProspect } from "../../types/prospecting/email";

interface EmailCardProps {
  email: EmailProspect;
  onPress: (email: EmailProspect) => void;
  colors: any;
}

export function EmailCard({ email, onPress, colors }: EmailCardProps) {
  const statusColor = getEmailStatusColor(email.status, colors);
  const statusSoft = getEmailStatusSoftBg(email.status, colors);
  const statusBorder = getEmailStatusBorder(email.status, colors);

  const isSendingStatus = email.status === "sending" || email.status === "approved";
  const isSentOrReplied = email.status === "sent" || email.status === "replied";

  const replyCount =
    typeof email.reply_count === "number" && email.reply_count > 0
      ? email.reply_count
      : email.replies && email.replies.length > 0
        ? email.replies.length
        : email.status === "replied" || email.reply_snippet
          ? 1
          : 0;

  const statusLabel =
    email.status === "draft"
      ? "Pending"
      : isSendingStatus
        ? "Sending..."
        : email.status === "replied"
          ? "Replied"
          : email.status === "sent"
            ? "Sent"
            : "Rejected";

  const verificationScore = email.verification?.score;
  const subject = email.email_body?.subject || email.subject || "No Subject";
  const bodyPreview = email.email_body?.body || email.body || "";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(email)}
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
            {email.company_name || "Target Outreach"}
          </Text>
          {email.company_domain ? (
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
                {email.company_domain}
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
          {isSentOrReplied || replyCount > 0 ? (
            <View
              style={[
                styles.miniMatchBadge,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor:
                    replyCount > 0 ? colors.successSoft : colors.surfaceElevated,
                  borderColor:
                    replyCount > 0 ? colors.successBorder : colors.border,
                },
              ]}
            >
              <MessageSquare
                size={11}
                color={replyCount > 0 ? colors.success : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.miniMatchText,
                  {
                    color:
                      replyCount > 0 ? colors.success : colors.textSecondary,
                  },
                ]}
              >
                {replyCount} {replyCount === 1 ? "Reply" : "Replies"}
              </Text>
            </View>
          ) : null}

          {verificationScore !== undefined && !isSentOrReplied ? (
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
                backgroundColor:
                  replyCount > 0 ? colors.successSoft : colors.surfaceElevated,
                borderColor:
                  replyCount > 0 ? colors.successBorder : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.cardShowDetailText,
                { color: replyCount > 0 ? colors.success : colors.text },
              ]}
            >
              {replyCount > 0
                ? `View ${replyCount === 1 ? "Reply" : "Replies"}`
                : isSentOrReplied
                  ? "View Sent"
                  : isSendingStatus
                    ? "Sending..."
                    : "Open Draft"}
            </Text>
            <ChevronRight
              size={12}
              color={replyCount > 0 ? colors.success : colors.textSecondary}
              strokeWidth={1.75}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  prospectCard: {
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm + 2,
    marginBottom: tokens.spacing.md,
    ...tokens.shadow.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  avatarIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    lineHeight: 22,
  },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardSubtext: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  cardRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
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
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs - 1,
    lineHeight: 14,
  },
  emailPreviewBox: {
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    gap: 4,
  },
  emailCardSubject: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
    lineHeight: 18,
  },
  emailCardSnippet: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
  },
  cardMetaText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  cardMetaRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  miniMatchBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  miniMatchText: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xs - 1,
    lineHeight: 14,
  },
  cardShowDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  cardShowDetailText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs - 1,
    lineHeight: 14,
  },
});
