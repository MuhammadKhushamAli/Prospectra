import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { tokens } from "../../constants/theme";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import { profileSetupCopy } from "../../constants/constants";
import { validateProfileHeadline } from "../../validation/profileValidation";

interface ProfileSetupFormProps {
  initialHeadline?: string;
  onSubmit?: (headline: string) => void;
  isLoading?: boolean;
}

export default function ProfileSetupForm({
  initialHeadline = "",
  onSubmit,
  isLoading = false,
}: ProfileSetupFormProps) {
  const [headline, setHeadline] = useState(initialHeadline);
  const [error, setError] = useState<string | null>(null);

  const handleHeadlineChange = (text: string) => {
    setHeadline(text);
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = () => {
    const validationError = validateProfileHeadline(headline);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onSubmit?.(headline.trim());
  };

  return (
    <View style={styles.form}>
      <TextField
        label={profileSetupCopy.fields.headline}
        placeholder={profileSetupCopy.placeholders.headline}
        keyboardType="default"
        autoCapitalize="words"
        autoCorrect={false}
        value={headline}
        onChangeText={handleHeadlineChange}
        editable={!isLoading}
        error={error}
      />
      <Button
        label={
          isLoading
            ? profileSetupCopy.actions.submitting
            : profileSetupCopy.actions.submit
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
