import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import { organizationRegistrationCopy } from "../../constants/constants";
import {
  validateCompanyFinderThreshold,
  validateOrganizationName,
} from "../../validation/organizationValidation";
import type { OrganizationRegistrationFormProps } from "../../types/organization";

export type { OrganizationRegistrationFormProps };

export default function OrganizationRegistrationForm({
  onSubmit,
  isLoading,
}: OrganizationRegistrationFormProps) {
  const colors = useTheme();
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState("500");
  const [nameError, setNameError] = useState<string | null>(null);
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  const handleNameChange = (text: string) => {
    setName(text);
    if (nameError) {
      setNameError(null);
    }
  };

  const handleThresholdChange = (text: string) => {
    setThreshold(text);
    if (thresholdError) {
      setThresholdError(null);
    }
  };

  const handleSubmit = () => {
    const vNameError = validateOrganizationName(name);
    const vThresholdError = validateCompanyFinderThreshold(threshold);

    if (vNameError || vThresholdError) {
      setNameError(vNameError);
      setThresholdError(vThresholdError);
      return;
    }

    setNameError(null);
    setThresholdError(null);
    const parsedThreshold = parseInt(threshold.trim(), 10);
    onSubmit?.({
      name: name.trim(),
      pending_threshold: isNaN(parsedThreshold) ? 500 : parsedThreshold,
    });
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
        error={nameError}
      />

      <View style={styles.thresholdBlock}>
        <TextField
          label={organizationRegistrationCopy.fields.threshold}
          placeholder={organizationRegistrationCopy.placeholders.threshold}
          keyboardType="number-pad"
          autoCapitalize="none"
          autoCorrect={false}
          value={threshold}
          onChangeText={handleThresholdChange}
          editable={!isLoading}
          error={thresholdError}
        />
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          {organizationRegistrationCopy.helpers.threshold}
        </Text>
      </View>

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
  thresholdBlock: {
    gap: 4,
  },
  helperText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
    paddingHorizontal: 2,
  },
});
