import { Pressable, StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { buttonVariant, emailVerificationCopy } from "../../constants/constants";
import type { EmailVerificationFormProps } from "../../types/domain";
import Button from "../ui/Button";
import PasswordField from "../ui/PasswordField";
import TextField from "../ui/TextField";

export default function EmailVerificationForm({
  activeDomain,
  userEmail,
  providers,
  emailProvider,
  customEmailProvider,
  smtpServer,
  smtpPort,
  dkimSelector,
  smtpPassword,
  emailStatus,
  emailDetails,
  isVerifyingEmail,
  onSelectProvider,
  onChangeCustomEmailProvider,
  onChangeSmtpServer,
  onChangeSmtpPort,
  onChangeDkimSelector,
  onChangeSmtpPassword,
  onVerifyEmail,
  onContinueToDashboard,
}: EmailVerificationFormProps) {
  const colors = useTheme();
  const isEmailVerified = emailStatus === "verified";
  const isEmailFailed = emailStatus === "failed";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isEmailVerified ? colors.successBorder : colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Email & SMTP Verification
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isEmailVerified
                ? colors.successSoft
                : isEmailFailed
                  ? colors.errorSoft
                  : colors.warningSoft,
              borderColor: isEmailVerified
                ? colors.successBorder
                : isEmailFailed
                  ? colors.errorBorder
                  : colors.warningBorder,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isEmailVerified
                  ? colors.success
                  : isEmailFailed
                    ? colors.error
                    : colors.warning,
              },
            ]}
          />
          <Text
            style={[
              styles.statusBadgeText,
              {
                color: isEmailVerified
                  ? colors.success
                  : isEmailFailed
                    ? colors.error
                    : colors.warning,
              },
            ]}
          >
            {emailStatus ? emailStatus.toUpperCase() : "REQUIRED"}
          </Text>
        </View>
      </View>

      <Text style={[styles.instructions, { color: colors.textSecondary }]}>
        Select your email provider and confirm the SMTP server and port used to
        verify{" "}
        <Text style={[styles.highlight, { color: colors.text }]}>
          {userEmail || (activeDomain ? `your @${activeDomain} email` : "your sender email")}
        </Text>{" "}
        via DNS (MX, SPF, DKIM, DMARC, AuthRes). The app will automatically
        choose the best security protocol and save your settings for sending
        outreach emails.
      </Text>

      <View style={styles.providerSection}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          {emailVerificationCopy.fields.emailProvider}
        </Text>
        <View style={styles.chipGrid}>
          {providers.map((preset) => {
            const selected = emailProvider === preset.id;
            return (
              <Pressable
                key={preset.id}
                accessibilityRole="button"
                onPress={() => onSelectProvider(preset.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected
                      ? colors.accentSoft
                      : colors.surfaceElevated,
                    borderColor: selected ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? colors.accent : colors.text },
                  ]}
                >
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {emailProvider === "other" ? (
        <TextField
          label={emailVerificationCopy.fields.customEmailProvider}
          placeholder={emailVerificationCopy.placeholders.customEmailProvider}
          autoCapitalize="words"
          autoCorrect={false}
          value={customEmailProvider}
          onChangeText={onChangeCustomEmailProvider}
          editable={!isVerifyingEmail}
        />
      ) : null}

      <TextField
        label={emailVerificationCopy.fields.smtpServer}
        placeholder={emailVerificationCopy.placeholders.smtpServer}
        autoCapitalize="none"
        autoCorrect={false}
        value={smtpServer}
        onChangeText={onChangeSmtpServer}
        editable={!isVerifyingEmail}
      />

      <View style={styles.smtpRow}>
        <View style={styles.smtpPortCol}>
          <TextField
            label={emailVerificationCopy.fields.smtpPort}
            placeholder={emailVerificationCopy.placeholders.smtpPort}
            keyboardType="numeric"
            autoCapitalize="none"
            value={smtpPort}
            onChangeText={onChangeSmtpPort}
            editable={!isVerifyingEmail}
          />
        </View>
        <View style={styles.smtpSelectorCol}>
          <TextField
            label={emailVerificationCopy.fields.dkimSelector}
            placeholder={emailVerificationCopy.placeholders.dkimSelector}
            autoCapitalize="none"
            autoCorrect={false}
            value={dkimSelector}
            onChangeText={onChangeDkimSelector}
            editable={!isVerifyingEmail}
          />
        </View>
      </View>

      <PasswordField
        label={emailVerificationCopy.fields.smtpPassword}
        placeholder={emailVerificationCopy.placeholders.smtpPassword}
        value={smtpPassword}
        onChangeText={onChangeSmtpPassword}
      />

      {emailDetails ? (
        <View
          style={[
            styles.auditBox,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Email Authentication & SMTP Audit
          </Text>
          <View style={styles.auditPillsRow}>
            {[
              { label: "SMTP", ok: Boolean(emailDetails.smtp_reachable) },
              { label: "MX", ok: Boolean(emailDetails.mx_valid) },
              { label: "SPF", ok: Boolean(emailDetails.spf_valid) },
              { label: "DKIM", ok: Boolean(emailDetails.dkim_valid) },
              { label: "DMARC", ok: Boolean(emailDetails.dmarc_valid) },
            ].map((item) => (
              <View
                key={item.label}
                style={[
                  styles.auditPill,
                  {
                    backgroundColor: item.ok
                      ? colors.successSoft
                      : colors.warningSoft,
                    borderColor: item.ok
                      ? colors.successBorder
                      : colors.warningBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.auditPillText,
                    { color: item.ok ? colors.success : colors.warning },
                  ]}
                >
                  {item.label}: {item.ok ? "PASS" : "WARN"}
                </Text>
              </View>
            ))}
            {emailDetails.smtp_used ? (
              <View
                style={[
                  styles.auditPill,
                  {
                    backgroundColor: colors.accentSoft,
                    borderColor: colors.accentBorder,
                  },
                ]}
              >
                <Text style={[styles.auditPillText, { color: colors.accent }]}>
                  {`Protocol: ${emailDetails.smtp_used}`}
                </Text>
              </View>
            ) : null}
          </View>
          {emailDetails.authentication_results_header ? (
            <Text
              selectable
              style={[styles.authResText, { color: colors.textSecondary }]}
            >
              AuthRes: {emailDetails.authentication_results_header}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!isEmailVerified ? (
        <Button
          label={
            isVerifyingEmail
              ? emailVerificationCopy.actions.verifyingEmail
              : emailVerificationCopy.actions.verifyEmail
          }
          variant={buttonVariant.primary}
          onPress={onVerifyEmail}
          disabled={isVerifyingEmail}
        />
      ) : null}

      {isEmailVerified ? (
        <View style={styles.continueWrap}>
          <Button
            label={emailVerificationCopy.actions.continueToDashboard}
            variant={buttonVariant.primary}
            onPress={onContinueToDashboard}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    gap: tokens.spacing.md,
    ...tokens.shadow.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexShrink: 0,
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
  highlight: {
    fontFamily: "DMSansSemiBold",
  },
  providerSection: {
    gap: tokens.spacing.xs + 2,
  },
  fieldLabel: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs + 2,
  },
  chip: {
    paddingHorizontal: tokens.spacing.sm + 4,
    paddingVertical: tokens.spacing.xs + 2,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  smtpRow: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
  },
  smtpPortCol: {
    width: 110,
  },
  smtpSelectorCol: {
    flex: 1,
  },
  auditBox: {
    padding: tokens.spacing.sm + 4,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: tokens.spacing.xs + 2,
  },
  auditPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  auditPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  auditPillText: {
    fontFamily: "DMSansSemiBold",
    fontSize: 11,
  },
  authResText: {
    fontFamily: "DMSans",
    fontSize: 11,
    lineHeight: 16,
  },
  continueWrap: {
    marginTop: tokens.spacing.xs,
  },
});

