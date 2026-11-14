import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { useDomainVerification } from "../../hooks/useDomainVerification";
import type { EmailVerificationResponse } from "../../types/domain";
import type { NotificationVariant } from "../../types/ui";
import { getSupabaseClient } from "../../config/supabaseClient";
import { TABLES } from "../../constants/tables";
import { DB_KEYS } from "../../constants/dbKeys";
import {
  emailProviderPresets,
  type EmailProviderPresetOption,
} from "../../constants/domain";
import { checkUserOnboardingStatus } from "../../services/onboardingService";
import {
  getEmailProvidersFromBackend,
  resolveUserOrgId,
} from "../../services/domainService";
import {
  domainValidationMessages,
  emailVerificationCopy,
  notificationVariant,
} from "../../constants/constants";
import NotificationBanner from "../ui/NotificationBanner";
import DomainVerificationFooterLink from "../domain/DomainVerificationFooterLink";
import EmailVerificationHeader from "./EmailVerificationHeader";
import EmailVerificationForm from "./EmailVerificationForm";

export default function EmailVerificationScreen() {
  const colors = useTheme();
  const { verifyEmail, isVerifyingEmail } = useDomainVerification();

  const [isInitializing, setIsInitializing] = useState(true);
  const [notification, setNotification] = useState<{
    variant: NotificationVariant;
    message: string;
  } | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeDomain, setActiveDomain] = useState<string>("");

  const [providers, setProviders] = useState<EmailProviderPresetOption[]>([
    ...emailProviderPresets,
  ]);
  const [emailProvider, setEmailProvider] = useState<string>(
    emailProviderPresets[0].id,
  );
  const [customEmailProvider, setCustomEmailProvider] = useState<string>("");
  const [smtpServer, setSmtpServer] = useState<string>(
    emailProviderPresets[0].smtpServer,
  );
  const [smtpPort, setSmtpPort] = useState<string>(
    String(emailProviderPresets[0].smtpPort),
  );
  const [dkimSelector, setDkimSelector] = useState<string>(
    emailProviderPresets[0].defaultDkimSelector,
  );
  const [smtpPassword, setSmtpPassword] = useState<string>("");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailDetails, setEmailDetails] = useState<
    Partial<EmailVerificationResponse> | Record<string, any> | null
  >(null);

  const applySavedProviderState = useCallback(
    (
      providerList: EmailProviderPresetOption[],
      rawProvider?: string | null,
      rawProviderId?: string | null,
    ) => {
      const candidate = (rawProviderId || rawProvider || "").trim();
      if (!candidate) return;
      const match = providerList.find(
        (p) =>
          p.id.toLowerCase() === candidate.toLowerCase() ||
          p.label.toLowerCase() === candidate.toLowerCase(),
      );
      if (match) {
        setEmailProvider(match.id);
        if (match.id === "other" && rawProvider) {
          setCustomEmailProvider(rawProvider);
        }
      } else {
        setEmailProvider("other");
        setCustomEmailProvider(rawProvider || candidate);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function init() {
        try {
          const status = await checkUserOnboardingStatus();
          if (!isMounted) return;
          if (status.targetRoute !== "/email-verification") {
            router.replace(status.targetRoute as any);
            return;
          }

          const supabase = getSupabaseClient();
          const [{ data: authData }, loadedProviders, orgId] =
            await Promise.all([
              supabase.auth.getUser(),
              getEmailProvidersFromBackend(),
              resolveUserOrgId().catch(() => null),
            ]);

          if (!isMounted) return;
          if (authData?.user?.email) {
            setUserEmail(authData.user.email);
          }
          if (loadedProviders.length > 0) {
            setProviders(loadedProviders);
          }

          if (orgId) {
            const { data: rec } = await supabase
              .from(TABLES.DOMAIN_VERIFICATIONS)
              .select("*")
              .eq(DB_KEYS.ORG_ID, orgId)
              .maybeSingle();

            if (!isMounted) return;
            if (rec) {
              const recAny = rec as Record<string, any>;
              setActiveDomain(recAny.domain || "");

              const dns = (recAny.dns_records || {}) as Record<string, any>;
              const savedSmtp = dns?.smtp_config || {};
              const savedEmailVerif =
                recAny.email_verification_details ||
                dns?.email_verification ||
                null;
              const savedEmailStatus =
                recAny.email_verification_status ||
                savedEmailVerif?.status ||
                null;

              applySavedProviderState(
                loadedProviders,
                recAny.email_provider || savedSmtp.email_provider,
                savedSmtp.email_provider_id || recAny.esp_provider,
              );
              if (recAny.smtp_server || savedSmtp.smtp_server) {
                setSmtpServer(recAny.smtp_server || savedSmtp.smtp_server);
              }
              if (recAny.smtp_port || savedSmtp.smtp_port) {
                setSmtpPort(String(recAny.smtp_port || savedSmtp.smtp_port));
              }
              if (recAny.dkim_selector || savedSmtp.dkim_selector) {
                setDkimSelector(recAny.dkim_selector || savedSmtp.dkim_selector);
              }
              if (savedEmailStatus) {
                setEmailStatus(savedEmailStatus);
              }
              if (savedEmailVerif) {
                setEmailDetails(savedEmailVerif);
              }
            }
          }
        } catch {
          if (isMounted) {
            router.replace("/auth");
          }
        } finally {
          if (isMounted) {
            setIsInitializing(false);
          }
        }
      }

      init();
      return () => {
        isMounted = false;
      };
    }, [applySavedProviderState]),
  );

  const handleSelectProvider = (providerId: string) => {
    setEmailProvider(providerId);
    const preset = providers.find((p) => p.id === providerId);
    if (preset) {
      if (preset.id === "other") {
        setSmtpServer("");
      } else if (preset.smtpServer) {
        setSmtpServer(preset.smtpServer);
      }
      setSmtpPort(String(preset.smtpPort));
      setDkimSelector(preset.defaultDkimSelector);
    }
  };

  const handleVerifyEmail = async () => {
    setNotification(null);
    if (!emailProvider) {
      setNotification({
        variant: notificationVariant.error,
        message: domainValidationMessages.missingProvider,
      });
      return;
    }
    if (emailProvider === "other" && !customEmailProvider.trim()) {
      setNotification({
        variant: notificationVariant.error,
        message: domainValidationMessages.missingCustomProvider,
      });
      return;
    }
    if (!smtpServer.trim()) {
      setNotification({
        variant: notificationVariant.error,
        message: domainValidationMessages.missingSmtpServer,
      });
      return;
    }
    const parsedPort = Number.parseInt(smtpPort.trim(), 10);
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      setNotification({
        variant: notificationVariant.error,
        message: domainValidationMessages.invalidSmtpPort,
      });
      return;
    }

    try {
      const result = await verifyEmail({
        email: userEmail || undefined,
        email_provider: emailProvider,
        custom_email_provider:
          emailProvider === "other" ? customEmailProvider.trim() : undefined,
        smtp_server: smtpServer.trim(),
        smtp_port: parsedPort,
        smtp_username: userEmail || undefined,
        smtp_password: smtpPassword.trim() || undefined,
        dkim_selector: dkimSelector.trim() || undefined,
      });

      setEmailStatus(result.verification_status);
      setEmailDetails(result);

      if (result.verified) {
        if (result.is_custom_provider) {
          const updatedProviders = await getEmailProvidersFromBackend();
          setProviders(updatedProviders);
          setEmailProvider(result.email_provider);
          setCustomEmailProvider("");
        }
        setNotification({
          variant: notificationVariant.success,
          message: `${emailVerificationCopy.emailVerifiedSuccess} Protocol selected: ${result.smtp_used}.`,
        });
      } else {
        const errText =
          result.errors?.join(" ") ||
          "Email or SMTP verification failed. Check your SMTP server, port, and DNS records.";
        setNotification({
          variant: notificationVariant.error,
          message: errText,
        });
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to verify email and SMTP configuration.";
      setNotification({
        variant: notificationVariant.error,
        message: msg,
      });
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

  if (isInitializing) {
    return (
      <View
        style={[styles.loadingScreen, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
          <EmailVerificationHeader />
          <EmailVerificationForm
            activeDomain={activeDomain}
            userEmail={userEmail}
            providers={providers}
            emailProvider={emailProvider}
            customEmailProvider={customEmailProvider}
            smtpServer={smtpServer}
            smtpPort={smtpPort}
            dkimSelector={dkimSelector}
            smtpPassword={smtpPassword}
            emailStatus={emailStatus}
            emailDetails={emailDetails}
            isVerifyingEmail={isVerifyingEmail}
            onSelectProvider={handleSelectProvider}
            onChangeCustomEmailProvider={setCustomEmailProvider}
            onChangeSmtpServer={setSmtpServer}
            onChangeSmtpPort={setSmtpPort}
            onChangeDkimSelector={setDkimSelector}
            onChangeSmtpPassword={setSmtpPassword}
            onVerifyEmail={handleVerifyEmail}
            onContinueToDashboard={() => router.replace("/home")}
          />
          <DomainVerificationFooterLink onPress={handleBackToLogin} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
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
});

