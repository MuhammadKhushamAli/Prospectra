import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, Copy } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import type { DnsInstructions } from "../../types/domain";

interface DnsRecordCardProps {
  dnsInstructions: DnsInstructions | null;
  activeDomain: string;
  token: string | null;
  currentStatus: string | null;
  copied: boolean;
  copiedHost: boolean;
  onCopyHost: () => void;
  onCopyValue: () => void;
  colors: any;
}

export function DnsRecordCard({
  dnsInstructions,
  activeDomain,
  token,
  currentStatus,
  copied,
  copiedHost,
  onCopyHost,
  onCopyValue,
  colors,
}: DnsRecordCardProps) {
  const isVerified = currentStatus?.toLowerCase() === "verified";
  const isFailed = currentStatus?.toLowerCase() === "failed";

  return (
    <View
      style={[
        styles.instructionsBox,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.instructionsHeaderRow}>
        <Text style={[styles.boxTitle, { color: colors.text }]}>
          DNS Verification Record
        </Text>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isVerified
                ? colors.successSoft
                : isFailed
                  ? colors.errorSoft
                  : colors.warningSoft,
              borderColor: isVerified
                ? colors.successBorder
                : isFailed
                  ? colors.errorBorder
                  : colors.warningBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              {
                color: isVerified
                  ? colors.success
                  : isFailed
                    ? colors.error
                    : colors.warning,
              },
            ]}
          >
            {currentStatus ? currentStatus.toUpperCase() : "PENDING"}
          </Text>
        </View>
      </View>

      <Text style={[styles.instructions, { color: colors.textSecondary }]}>
        {dnsInstructions?.title ||
          "Add this DNS record to your domain provider:"}
      </Text>

      <View
        style={[
          styles.recordRow,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.recordFieldType}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Record Type
          </Text>
          <Text style={[styles.fieldValue, { color: colors.text }]}>
            {dnsInstructions?.type || "TXT"}
          </Text>
        </View>
        <View
          style={[
            styles.recordDivider,
            { backgroundColor: colors.border },
          ]}
        />
        <View style={styles.recordFieldHost}>
          <View style={styles.fieldLabelRow}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Host / Name
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onCopyHost}
              style={({ pressed }) => [
                styles.inlineCopyBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              {copiedHost ? (
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
                  styles.inlineCopyText,
                  {
                    color: copiedHost
                      ? colors.success
                      : colors.textSecondary,
                  },
                ]}
              >
                {copiedHost ? "Copied" : "Copy"}
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.fieldValue, { color: colors.text }]}>
            {dnsInstructions?.host ||
              `_prospectra${activeDomain ? `.${activeDomain}` : ""}`}
          </Text>
        </View>
      </View>

      {token || dnsInstructions?.value ? (
        <View style={styles.tokenValueBlock}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            TXT Value
          </Text>
          <View
            style={[
              styles.tokenContainer,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.tokenText, { color: colors.text }]}
              numberOfLines={3}
              selectable
            >
              {token || dnsInstructions?.value}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onCopyValue}
              style={({ pressed }) => [
                styles.copyButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {copied ? (
                <Check
                  size={14}
                  color={colors.success}
                  strokeWidth={1.75}
                />
              ) : (
                <Copy
                  size={14}
                  color={colors.textSecondary}
                  strokeWidth={1.75}
                />
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  instructionsBox: {
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    ...tokens.shadow.sm,
  },
  instructionsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  boxTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    lineHeight: 22,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  statusPillText: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xs - 2,
    lineHeight: 14,
  },
  instructions: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    padding: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  recordFieldType: {
    width: 80,
    gap: 2,
  },
  recordDivider: {
    width: 1,
    height: "100%",
  },
  recordFieldHost: {
    flex: 1,
    gap: 2,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs - 1,
    lineHeight: 14,
  },
  fieldValue: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  inlineCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  inlineCopyText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs - 2,
    lineHeight: 14,
  },
  tokenValueBlock: {
    gap: 4,
  },
  tokenContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    padding: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  tokenText: {
    flex: 1,
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  copyButton: {
    width: 30,
    height: 30,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
