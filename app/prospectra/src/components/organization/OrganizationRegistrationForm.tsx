import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { tokens } from "../../constants/theme";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import { organizationRegistrationCopy } from "../../constants/constants";
import { validateOrganizationName } from "../../validation/organizationValidation";
import type { OrganizationRegistrationFormProps } from "../../types/organization";

export type { OrganizationRegistrationFormProps };

export default function OrganizationRegistrationForm({
  onSubmit,
  isLoading,
}: OrganizationRegistrationFormProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (text: string) => {
    setName(text);
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = () => {
    const validationError = validateOrganizationName(name);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onSubmit?.(name.trim());
  };

  return (
    <View style={styles.form}>
      <TextField
        label={organizationRegistrationCopy.fields.name}
        placeholder={organizationRegistrationCopy.placeholders.name}
        keyboardType="default"
        autoCapitalize="words"
        autoCorrect={false}
        value={name}
        onChangeText={handleNameChange}
        editable={!isLoading}
        error={error}
      />
      <Button
        label={
          isLoading
            ? organizationRegistrationCopy.actions.submitting
            : organizationRegistrationCopy.actions.submit
        }
        onPress={handleSubmit}
        disabled={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.spacing.md },
});
