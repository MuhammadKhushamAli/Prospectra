import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { tokens } from "../../constants/theme";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import { profileSetupCopy } from "../../constants/constants";
import { validateProfileHeadline } from "../../validation/profileValidation";
import type { ProfileSetupFormProps } from "../../types/profile";

import ProfileSkillsSection from "./ProfileSkillsSection";

export type { ProfileSetupFormProps };

export default function ProfileSetupForm({
  initialHeadline = "",
  initialSkills = [],
  onSubmit,
  isLoading = false,
}: ProfileSetupFormProps) {
  const [headline, setHeadline] = useState(initialHeadline);
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHeadline(initialHeadline);
  }, [initialHeadline]);

  useEffect(() => {
    setSkills(initialSkills);
  }, [initialSkills]);

  const handleHeadlineChange = (text: string) => {
    setHeadline(text);
    if (error) {
      setError(null);
    }
  };

  const handleAddSkill = (skill: string) => {
    setSkills((prev) => [...prev, skill]);
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) =>
      prev.filter((s) => s.toLowerCase() !== skillToRemove.toLowerCase()),
    );
  };

  const handleSubmit = () => {
    const validationError = validateProfileHeadline(headline);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onSubmit?.({
      headline: headline.trim(),
      skills,
    });
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

      <ProfileSkillsSection
        skills={skills}
        onAddSkill={handleAddSkill}
        onRemoveSkill={handleRemoveSkill}
        editable={!isLoading}
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
