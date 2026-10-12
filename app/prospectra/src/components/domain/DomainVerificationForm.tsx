import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { tokens } from "../../constants/theme";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import { domainVerificationCopy } from "../../constants/constants";

interface DomainVerificationFormProps {
  onSubmit?: (domain: string) => void;
  isLoading?: boolean;
}

export default function DomainVerificationForm({
  onSubmit,
  isLoading,
}: DomainVerificationFormProps) {
  const [domain, setDomain] = useState("");

  return (
    <View style={styles.form}>
      <TextField
        label={domainVerificationCopy.fields.domain}
        placeholder={domainVerificationCopy.placeholders.domain}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        value={domain}
        onChangeText={setDomain}
        editable={!isLoading}
      />
      <Button
        label={
          isLoading
            ? domainVerificationCopy.actions.verifying
            : domainVerificationCopy.actions.verify
        }
        onPress={() => onSubmit?.(domain)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.spacing.md },
});
