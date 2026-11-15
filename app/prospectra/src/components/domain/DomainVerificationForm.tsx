import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import {
  domainValidationMessages,
  domainVerificationCopy,
} from "../../constants/constants";
import {
  extractDomainFromEmail,
  isFreeEmailProvider,
  sanitizeDomainInput,
  validateDomain,
  validateMailboxEmail,
} from "../../validation/domainValidation";
import type { DomainVerificationFormProps } from "../../types/domain";

export type { DomainVerificationFormProps };

export default function DomainVerificationForm({
  onSubmit,
  isLoading,
  userEmail,
  initialDomain,
  initialMailboxEmail,
}: DomainVerificationFormProps) {
  const colors = useTheme();
  const [domain, setDomain] = useState(initialDomain || "");
  const [mailboxEmail, setMailboxEmail] = useState(initialMailboxEmail || "");
  const [error, setError] = useState<string | null>(null);
  const [mailboxError, setMailboxError] = useState<string | null>(null);

  const expectedUserDomain = userEmail ? extractDomainFromEmail(userEmail) : "";

  useEffect(() => {
    if (initialDomain) {
      setDomain(initialDomain);
    } else if (expectedUserDomain && !isFreeEmailProvider(expectedUserDomain)) {
      setDomain((prev) => prev || expectedUserDomain);
    }
  }, [initialDomain, expectedUserDomain]);

  useEffect(() => {
    if (initialMailboxEmail) {
      setMailboxEmail(initialMailboxEmail);
    }
  }, [initialMailboxEmail]);

  const handleDomainChange = (text: string) => {
    setDomain(text);
    const trimmed = text.trim();
    if (!trimmed) {
      setError(null);
      return;
    }
    if (isFreeEmailProvider(trimmed)) {
      setError(domainValidationMessages.freeEmailProvider);
      return;
    }
    if (expectedUserDomain && sanitizeDomainInput(trimmed) !== expectedUserDomain) {
      setError(`${domainValidationMessages.domainEmailMismatch} Expected: ${expectedUserDomain}`);
      return;
    }
    setError(null);
  };

  const handleMailboxEmailChange = (text: string) => {
    setMailboxEmail(text);
    if (!text.trim()) {
      setMailboxError(null);
      return;
    }
    setMailboxError(validateMailboxEmail(text));
  };

  const handleSubmit = () => {
    const validationError = validateDomain(domain, userEmail);
    const mailboxValidationError = validateMailboxEmail(mailboxEmail);
    if (validationError) {
      setError(validationError);
    } else {
      setError(null);
    }
    if (mailboxValidationError) {
      setMailboxError(mailboxValidationError);
    } else {
      setMailboxError(null);
    }
    if (validationError || mailboxValidationError) {
      return;
    }
    onSubmit?.(sanitizeDomainInput(domain), mailboxEmail.trim().toLowerCase());
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {userEmail ? (
        <View
          style={[
            styles.emailHintBox,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.emailHintLabel, { color: colors.textSecondary }]}>
            Signed-in account email:{" "}
            <Text style={[styles.emailHintValue, { color: colors.text }]}>
              {userEmail}
            </Text>
          </Text>
          {expectedUserDomain ? (
            <Text style={[styles.emailHintSub, { color: colors.textSecondary }]}>
              Your domain must match <Text style={{ color: colors.text }}>{expectedUserDomain}</Text>
            </Text>
          ) : null}
        </View>
      ) : null}
      <TextField
        label={domainVerificationCopy.fields.domain}
        placeholder={expectedUserDomain || domainVerificationCopy.placeholders.domain}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        value={domain}
        onChangeText={handleDomainChange}
        editable={!isLoading}
        error={error}
      />
      <TextField
        label={domainVerificationCopy.fields.mailboxEmail}
        placeholder={domainVerificationCopy.placeholders.mailboxEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={mailboxEmail}
        onChangeText={handleMailboxEmailChange}
        editable={!isLoading}
        error={mailboxError}
      />
      <Button
        label={
          isLoading
            ? domainVerificationCopy.actions.verifying
            : domainVerificationCopy.actions.verify
        }
        onPress={handleSubmit}
        disabled={isLoading || Boolean(error) || Boolean(mailboxError)}
      />
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
  emailHintBox: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: 2,
  },
  emailHintLabel: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
  },
  emailHintValue: {
    fontFamily: "DMSansSemiBold",
  },
  emailHintSub: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
  },
});
