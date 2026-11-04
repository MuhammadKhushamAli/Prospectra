import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { useDomainVerification } from "../../hooks/useDomainVerification";
import type { DnsInstructions } from "../../types/domain";
import type { NotificationVariant } from "../../types/ui";
import { getSupabaseClient } from "../../config/supabaseClient";
import { TABLES } from "../../constants/tables";
import { DB_KEYS } from "../../constants/dbKeys";
import { checkUserOnboardingStatus } from "../../services/onboardingService";
import { resolveUserOrgId } from "../../services/domainService";
import NotificationBanner from "../ui/NotificationBanner";
import Button from "../ui/Button";
import DomainVerificationHeader from "./DomainVerificationHeader";
import DomainVerificationForm from "./DomainVerificationForm";
import DomainVerificationFooterLink from "./DomainVerificationFooterLink";
import * as Clipboard from "expo-clipboard";
import { Check, Copy } from "lucide-react-native";
import {
  buttonVariant,
  domainVerificationCopy,
  notificationVariant,
} from "../../constants/constants";

export default function DomainVerificationScreen() {
  const colors = useTheme();
  const { verifyDomain, checkDomainStatus, isLoading, isCheckingStatus } =
    useDomainVerification();

  const [notification, setNotification] = useState<{
    variant: NotificationVariant;
    message: string;
  } | null>(null);

  const [activeDomain, setActiveDomain] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  const [dnsInstructions, setDnsInstructions] =
    useState<DnsInstructions | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const status = await checkUserOnboardingStatus();
        if (!isMounted) return;
        if (status.targetRoute !== "/domain-verification") {
          router.replace(status.targetRoute as any);
          return;
        }
        const orgId = await resolveUserOrgId().catch(() => null);
        if (orgId) {
          const supabase = getSupabaseClient();
          const { data: rec } = await supabase
            .from(TABLES.DOMAIN_VERIFICATIONS)
            .select(
              `${DB_KEYS.DOMAIN}, ${DB_KEYS.VERIFICATION_STATUS}, ${DB_KEYS.DNS_RECORDS}`,
            )
            .eq(DB_KEYS.ORG_ID, orgId)
            .maybeSingle();

          if (!isMounted) return;
          if (rec) {
            setActiveDomain(rec.domain || "");
            setCurrentStatus(rec.verification_status);
            const dns = rec.dns_records as any;
            if (dns?.value) {
              setToken(dns.value);
            }
            setDnsInstructions({
              title: "Add this DNS record to your domain provider:",
              type: dns?.type || "TXT",
              host:
                dns?.name ||
                `_prospectra${rec.domain ? `.${rec.domain}` : ""}`,
              value: dns?.value || "",
            });
          }
        }
      } catch {
        // ignore
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleVerify = async (domain: string) => {
    setNotification(null);
    setCopied(false);
    try {
      const result = await verifyDomain(domain);
      setActiveDomain(result.domain || domain);
      if (result.token) {
        setToken(result.token);
      }
      if (result.dns_instructions) {
        setDnsInstructions(result.dns_instructions);
      }
      const status =
        result.verification_status ||
        (result.verified ? "verified" : "pending");
      setCurrentStatus(status);

      if (result.verified) {
        setNotification({
          variant: notificationVariant.success,
          message: domainVerificationCopy.success,
        });
      } else {
        setNotification({
          variant: notificationVariant.success,
          message:
            "DNS verification token generated. Add the TXT record to your DNS.",
        });
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to submit domain for verification.";
      setNotification({
        variant: notificationVariant.error,
        message: msg,
      });
    }
  };

  const handleCheckStatus = async () => {
    setNotification(null);
    try {
      const statusResult = await checkDomainStatus();
      setCurrentStatus(statusResult.verification_status);
      if (statusResult.dns_records?.value) {
        setToken(statusResult.dns_records.value);
      }
      if (statusResult.dns_instructions) {
        setDnsInstructions(statusResult.dns_instructions);
      }
      if (statusResult.domain) {
        setActiveDomain(statusResult.domain);
      }

      if (statusResult.verification_status === "verified") {
        setNotification({
          variant: notificationVariant.success,
          message: "Domain verified successfully!",
        });
      } else {
        setNotification({
          variant: notificationVariant.success,
          message: `Current domain status: ${statusResult.verification_status.toUpperCase()}. DNS changes may take a few minutes to propagate.`,
        });
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to query domain status.";
      setNotification({
        variant: notificationVariant.error,
        message: msg,
      });
    }
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await Clipboard.setStringAsync(text);
      return true;
    } catch {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {
        return false;
      }
      return false;
    }
  };

  const handleCopyToken = async () => {
    const textToCopy = token || dnsInstructions?.value;
    if (!textToCopy) return;
    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyHost = async () => {
    const hostToCopy =
      dnsInstructions?.host ||
      `_prospectra${activeDomain ? `.${activeDomain}` : ""}`;
    if (!hostToCopy) return;
    const ok = await copyToClipboard(hostToCopy);
    if (ok) {
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2500);
    }
  };

  const handleBackToLogin = async () => {
    try {
      await getSupabaseClient().auth.signOut();
    } catch {
      // ignore
    }
    router.replace("/auth");
  };

  const isVerified = currentStatus === "verified";
  const isFailed = currentStatus === "failed";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {notification ? (
        <NotificationBanner
          variant={notification.variant}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      ) : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <DomainVerificationHeader />
          <DomainVerificationForm
            onSubmit={handleVerify}
            isLoading={isLoading}
          />

          {token || currentStatus ? (
            <View
              style={[
                styles.tokenContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: isVerified ? colors.successBorder : colors.border,
                },
              ]}
            >
              <View style={styles.tokenHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  DNS Configuration
                </Text>
                <View
                  style={[
                    styles.statusBadge,
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
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: isVerified
                          ? colors.success
                          : isFailed
                            ? colors.error
                            : colors.warning,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
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

              <Text
                style={[styles.instructions, { color: colors.textSecondary }]}
              >
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
                  <Text
                    style={[styles.fieldLabel, { color: colors.textSecondary }]}
                  >
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
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Host / Name
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={handleCopyHost}
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
                  <Text
                    style={[styles.fieldLabel, { color: colors.textSecondary }]}
                  >
                    Value / Token
                  </Text>
                  <View
                    style={[
                      styles.tokenBox,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      selectable
                      style={[styles.tokenText, { color: colors.text }]}
                    >
                      {token || dnsInstructions?.value}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleCopyToken}
                    style={({ pressed }) => [
                      styles.copyBtn,
                      {
                        backgroundColor: copied
                          ? colors.successSoft
                          : colors.surface,
                        borderColor: copied
                          ? colors.successBorder
                          : colors.border,
                        opacity: pressed ? 0.8 : 1,
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
                      <Copy size={14} color={colors.text} strokeWidth={1.75} />
                    )}
                    <Text
                      style={[
                        styles.copyBtnText,
                        {
                          color: copied ? colors.success : colors.text,
                        },
                      ]}
                    >
                      {copied ? "Copied to clipboard!" : "Copy Token"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.statusActionWrap}>
                <Button
                  label={
                    isCheckingStatus
                      ? domainVerificationCopy.actions.checkingStatus
                      : domainVerificationCopy.actions.checkStatus
                  }
                  variant={buttonVariant.ghost}
                  onPress={handleCheckStatus}
                  disabled={isCheckingStatus}
                />
              </View>

              {isVerified ? (
                <View style={styles.continueWrap}>
                  <Button
                    label={domainVerificationCopy.actions.continueToDashboard}
                    variant={buttonVariant.primary}
                    onPress={() => router.replace("/home")}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          <DomainVerificationFooterLink onPress={handleBackToLogin} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xl,
    paddingBottom: tokens.spacing.xl,
    justifyContent: "center",
  },
  tokenContainer: {
    marginTop: tokens.spacing.md,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    gap: tokens.spacing.md,
    ...tokens.shadow.sm,
  },
  tokenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
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
  instructions: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  recordRow: {
    flexDirection: "row",
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    padding: tokens.spacing.sm + 4,
    gap: tokens.spacing.md,
  },
  recordFieldType: {
    minWidth: 72,
    gap: tokens.spacing.xs,
  },
  recordDivider: {
    width: 1,
  },
  recordFieldHost: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  fieldLabel: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  fieldValue: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  tokenValueBlock: {
    gap: tokens.spacing.sm,
  },
  tokenBox: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm + 4,
  },
  tokenText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inlineCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.xs,
  },
  inlineCopyText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  copyBtn: {
    height: 36,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sm + 4,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
  },
  copyBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  statusActionWrap: {
    marginTop: tokens.spacing.xs,
  },
  continueWrap: {
    marginTop: tokens.spacing.xs,
  },
});
