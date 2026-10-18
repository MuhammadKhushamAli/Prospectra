import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { tokens } from "../../constants/theme";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import {
  domainValidationMessages,
  domainVerificationCopy,
} from "../../constants/constants";
import {
  isFreeEmailProvider,
  validateDomain,
} from "../../validation/domainValidation";
import type { DomainVerificationFormProps } from "../../types/domain";

export type { DomainVerificationFormProps };

export default function DomainVerificationForm({
  onSubmit,
  isLoading,
}: DomainVerificationFormProps) {
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleDomainChange = (text: string) => {
    setDomain(text);
    if (text.trim() && isFreeEmailProvider(text)) {
      setError(domainValidationMessages.freeEmailProvider);
    } else {
      setError(null);
    }
  };

  const handleSubmit = () => {
    const validationError = validateDomain(domain);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onSubmit?.(domain);
  };

  return (
    <View style={styles.form}>
      <TextField
        label={domainVerificationCopy.fields.domain}
        placeholder={domainVerificationCopy.placeholders.domain}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        value={domain}
        onChangeText={handleDomainChange}
        editable={!isLoading}
        error={error}
      />
      <Button
        label={
          isLoading
            ? domainVerificationCopy.actions.verifying
            : domainVerificationCopy.actions.verify
        }
        onPress={handleSubmit}
        disabled={isLoading || Boolean(error)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.spacing.md },
});
