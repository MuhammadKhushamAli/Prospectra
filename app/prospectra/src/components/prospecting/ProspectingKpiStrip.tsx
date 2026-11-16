import { StyleSheet, Text, View } from "react-native";
import { CheckCircle2, Clock, Mail, Send, XCircle } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import type { ProspectingTab } from "../../types/prospecting";

interface ProspectingKpiStripProps {
  activeTab: ProspectingTab;
  pendingCompaniesCount: number;
  approvedCompaniesCount: number;
  rejectedCompaniesCount: number;
  draftEmailsCount: number;
  sendingEmailsCount: number;
  sentEmailsCount: number;
  colors: any;
}

export function ProspectingKpiStrip({
  activeTab,
  pendingCompaniesCount,
  approvedCompaniesCount,
  rejectedCompaniesCount,
  draftEmailsCount,
  sendingEmailsCount,
  sentEmailsCount,
  colors,
}: ProspectingKpiStripProps) {
  if (activeTab === "companies") {
    return (
      <View style={styles.kpiRow}>
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
              { backgroundColor: colors.errorSoft },
            ]}
          >
            <XCircle
              size={14}
              color={colors.error}
              strokeWidth={1.75}
            />
          </View>
          <View style={styles.kpiTextWrap}>
            <Text
              style={[styles.kpiValue, { color: colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {rejectedCompaniesCount}
            </Text>
            <Text
              style={[styles.kpiLabel, { color: colors.textSecondary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Rejected
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.kpiRow}>
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
          <Mail size={14} color={colors.warning} strokeWidth={1.75} />
        </View>
        <View style={styles.kpiTextWrap}>
          <Text
            style={[styles.kpiValue, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {draftEmailsCount}
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
            { backgroundColor: colors.primarySoft },
          ]}
        >
          <Send size={14} color={colors.primary} strokeWidth={1.75} />
        </View>
        <View style={styles.kpiTextWrap}>
          <Text
            style={[styles.kpiValue, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {sendingEmailsCount}
          </Text>
          <Text
            style={[styles.kpiLabel, { color: colors.textSecondary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            Sending
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
          <CheckCircle2 size={14} color={colors.success} strokeWidth={1.75} />
        </View>
        <View style={styles.kpiTextWrap}>
          <Text
            style={[styles.kpiValue, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {sentEmailsCount}
          </Text>
          <Text
            style={[styles.kpiLabel, { color: colors.textSecondary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            Sent/Replied
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
  },
  kpiCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  kpiIconWrap: {
    width: 26,
    height: 26,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  kpiTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  kpiValue: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.sm,
    lineHeight: 18,
  },
  kpiLabel: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs - 2,
    lineHeight: 12,
  },
});
