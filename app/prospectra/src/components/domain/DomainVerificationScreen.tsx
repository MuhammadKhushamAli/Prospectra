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
import { checkUserOnboardingStatus } from "../../services/onboardingService";
import NotificationBanner from "../ui/NotificationBanner";
import Button from "../ui/Button";
import DomainVerificationHeader from "./DomainVerificationHeader";
import DomainVerificationForm from "./DomainVerificationForm";
import DomainVerificationFooterLink from "./DomainVerificationFooterLink";
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
        if (status.orgId) {
          const supabase = getSupabaseClient();
          const { data: rec } = await supabase
            .from("domain_verifications")
            .select("domain, verification_status, dns_records")
            .eq("org_id", status.orgId)
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
                dns?.name || `_prospectra${rec.domain ? `.${rec.domain}` : ""}`,
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

  const handleCopyToken = async () => {
    if (!token) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
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
                  borderColor: isVerified ? colors.success : colors.border,
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
                      backgroundColor:
                        currentStatus === "verified"
                          ? colors.success
                          : currentStatus === "failed"
                            ? colors.error
                            : colors.warning,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: colors.surfaceElevated },
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

              <View style={styles.recordRow}>
                <View style={styles.recordField}>
                  <Text
                    style={[styles.fieldLabel, { color: colors.textSecondary }]}
                  >
                    Record Type
                  </Text>
                  <Text style={[styles.fieldValue, { color: colors.text }]}>
                    {dnsInstructions?.type || "TXT"}
                  </Text>
                </View>
                <View style={styles.recordField}>
                  <Text
                    style={[styles.fieldLabel, { color: colors.textSecondary }]}
                  >
                    Host / Name
                  </Text>
                  <Text style={[styles.fieldValue, { color: colors.text }]}>
                    {dnsInstructions?.host ||
                      `_prospectra${activeDomain ? `.${activeDomain}` : ""}`}
                  </Text>
                </View>
              </View>

              {token ? (
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
                      {token}
                    </Text>
                  </View>
                  <Pressable
                    onPress={handleCopyToken}
                    style={({ pressed }) => [
                      styles.copyBtn,
                      {
                        backgroundColor: copied
                          ? colors.success
                          : colors.surfaceElevated,
                        borderColor: copied ? colors.success : colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.copyBtnText,
                        {
                          color: copied
                            ? colors.surfaceElevated
                            : colors.primary,
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
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xl,
  },
  tokenContainer: {
    marginTop: tokens.spacing.lg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    gap: tokens.spacing.sm,
  },
  tokenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
  },
  statusBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
  },
  statusBadgeText: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.xs,
    letterSpacing: 0.5,
  },
  instructions: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 18,
  },
  recordRow: {
    flexDirection: "row",
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.xs,
  },
  recordField: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    marginBottom: 2,
  },
  fieldValue: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
  },
  tokenValueBlock: {
    marginTop: tokens.spacing.xs,
    gap: tokens.spacing.xs,
  },
  tokenBox: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
  },
  tokenText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  copyBtn: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    alignSelf: "flex-start",
    alignItems: "center",
  },
  copyBtnText: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xs,
  },
  statusActionWrap: {
    marginTop: tokens.spacing.sm,
  },
  continueWrap: {
    marginTop: tokens.spacing.xs,
  },
});
