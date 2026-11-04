import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Check, Code2, Link2, X } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import { profileSetupCopy } from "../../constants/constants";
import {
  validateGithubUrl,
  validateLinkedinUrl,
  validateProfileHeadline,
} from "../../validation/profileValidation";
import { fetchGitHubProfileByUsername } from "../../services/githubAuthService";
import type { ProfileSetupFormProps } from "../../types/profile";
import ProfileSkillsSection from "./ProfileSkillsSection";

export type { ProfileSetupFormProps };

export default function ProfileSetupForm({
  initialHeadline = "",
  initialSkills = [],
  initialGithubUrl = "",
  initialLinkedinUrl = "",
  onSubmit,
  isLoading = false,
}: ProfileSetupFormProps) {
  const colors = useTheme();

  const [headline, setHeadline] = useState(initialHeadline);
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [githubUrl, setGithubUrl] = useState(initialGithubUrl);
  const [linkedinUrl, setLinkedinUrl] = useState(
    initialLinkedinUrl || "https://linkedin.com/in/",
  );

  // Field validation errors
  const [headlineError, setHeadlineError] = useState<string | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);

  // GitHub connection modal state
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubUsernameInput, setGithubUsernameInput] = useState("");
  const [githubModalError, setGithubModalError] = useState<string | null>(null);
  const [isFetchingUsername, setIsFetchingUsername] = useState(false);

  useEffect(() => {
    setHeadline(initialHeadline);
  }, [initialHeadline]);

  useEffect(() => {
    setSkills(initialSkills);
  }, [initialSkills]);

  useEffect(() => {
    if (initialGithubUrl) {
      setGithubUrl(initialGithubUrl);
    }
  }, [initialGithubUrl]);

  useEffect(() => {
    if (initialLinkedinUrl) {
      setLinkedinUrl(initialLinkedinUrl);
    }
  }, [initialLinkedinUrl]);

  const handleHeadlineChange = (text: string) => {
    setHeadline(text);
    if (headlineError) setHeadlineError(null);
  };

  const handleGithubUrlChange = (text: string) => {
    setGithubUrl(text);
    if (githubError) setGithubError(null);
  };

  const handleLinkedinUrlChange = (text: string) => {
    setLinkedinUrl(text);
    if (linkedinError) setLinkedinError(null);
  };

  const handleAddSkill = (skill: string) => {
    setSkills((prev) => [...prev, skill]);
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) =>
      prev.filter((s) => s.toLowerCase() !== skillToRemove.toLowerCase()),
    );
  };

  const handleConnectGithub = () => {
    setGithubModalError(null);
    setGithubUsernameInput("");
    setShowGithubModal(true);
  };

  const handleFetchGithubUsername = async () => {
    if (!githubUsernameInput.trim()) {
      setGithubModalError("Please enter your GitHub username.");
      return;
    }
    setIsFetchingUsername(true);
    setGithubModalError(null);

    const result = await fetchGitHubProfileByUsername(githubUsernameInput);
    setIsFetchingUsername(false);

    if (result.success && result.githubUrl) {
      setGithubUrl(result.githubUrl);
      setGithubError(null);
      setShowGithubModal(false);
      setGithubUsernameInput("");
    } else {
      setGithubModalError(result.error || "Failed to fetch GitHub profile.");
    }
  };

  const handleSubmit = () => {
    const headErr = validateProfileHeadline(headline);
    const ghErr = validateGithubUrl(githubUrl);
    const inErr = validateLinkedinUrl(linkedinUrl);

    if (headErr || ghErr || inErr) {
      setHeadlineError(headErr);
      setGithubError(ghErr);
      setLinkedinError(inErr);
      return;
    }

    setHeadlineError(null);
    setGithubError(null);
    setLinkedinError(null);

    let finalGithubUrl = githubUrl.trim();
    if (finalGithubUrl && !/^https?:\/\//i.test(finalGithubUrl)) {
      finalGithubUrl = `https://${finalGithubUrl.replace(/^@/, "github.com/")}`;
    }

    let finalLinkedinUrl = linkedinUrl.trim();
    const emptyPrefixes = [
      "https://linkedin.com/in/",
      "https://www.linkedin.com/in/",
      "http://linkedin.com/in/",
      "http://www.linkedin.com/in/",
      "https://linkedin.com/in",
      "https://www.linkedin.com/in",
      "linkedin.com/in/",
      "www.linkedin.com/in/",
      "linkedin.com/in",
      "www.linkedin.com/in",
    ];
    if (
      !finalLinkedinUrl ||
      emptyPrefixes.includes(finalLinkedinUrl.toLowerCase())
    ) {
      finalLinkedinUrl = "";
    } else if (!/^https?:\/\//i.test(finalLinkedinUrl)) {
      finalLinkedinUrl = `https://${finalLinkedinUrl}`;
    }

    onSubmit?.({
      headline: headline.trim(),
      skills,
      githubUrl: finalGithubUrl || undefined,
      linkedinUrl: finalLinkedinUrl || undefined,
    });
  };

  const isGithubConnected = Boolean(
    githubUrl && !validateGithubUrl(githubUrl),
  );

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
      {/* Professional Headline */}
      <TextField
        label={`${profileSetupCopy.fields.headline} *`}
        placeholder={profileSetupCopy.placeholders.headline}
        keyboardType="default"
        autoCapitalize="words"
        autoCorrect={false}
        value={headline}
        onChangeText={handleHeadlineChange}
        editable={!isLoading}
        error={headlineError}
      />

      {/* GitHub Profile Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.labelRow}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            {`${profileSetupCopy.fields.githubUrl} (Optional)`}
          </Text>
          {isGithubConnected ? (
            <View
              style={[
                styles.connectedBadge,
                {
                  backgroundColor: colors.successSoft,
                  borderColor: colors.successBorder,
                },
              ]}
            >
              <Check size={12} color={colors.success} strokeWidth={1.75} />
              <Text style={[styles.connectedText, { color: colors.success }]}>
                {profileSetupCopy.githubConnect.connected}
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.githubButton,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              opacity: isLoading ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}
          onPress={handleConnectGithub}
          disabled={isLoading}
        >
          <Code2 size={16} color={colors.text} strokeWidth={1.75} />
          <Text style={[styles.githubButtonText, { color: colors.text }]}>
            {profileSetupCopy.githubConnect.button}
          </Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View
            style={[styles.dividerLine, { backgroundColor: colors.border }]}
          />
          <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
            {profileSetupCopy.githubConnect.orManual}
          </Text>
          <View
            style={[styles.dividerLine, { backgroundColor: colors.border }]}
          />
        </View>

        <TextField
          placeholder={profileSetupCopy.placeholders.githubUrl}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          value={githubUrl}
          onChangeText={handleGithubUrlChange}
          editable={!isLoading}
          error={githubError}
          rightSlot={
            isGithubConnected ? (
              <Check
                size={16}
                color={colors.success}
                strokeWidth={1.75}
                style={styles.inputRightIcon}
              />
            ) : null
          }
        />
      </View>

      {/* LinkedIn Profile Section */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>
          {`${profileSetupCopy.fields.linkedinUrl} (Optional)`}
        </Text>
        <TextField
          placeholder={profileSetupCopy.placeholders.linkedinUrl}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          value={linkedinUrl}
          onChangeText={handleLinkedinUrlChange}
          editable={!isLoading}
          error={linkedinError}
          rightSlot={
            <Link2
              size={16}
              color={colors.textSecondary}
              strokeWidth={1.75}
              style={styles.inputRightIcon}
            />
          }
        />
      </View>

      <View
        style={[styles.sectionDivider, { backgroundColor: colors.border }]}
      />

      {/* Skills Section */}
      <ProfileSkillsSection
        skills={skills}
        onAddSkill={handleAddSkill}
        onRemoveSkill={handleRemoveSkill}
        editable={!isLoading}
      />

      {/* Submit Button */}
      <View style={styles.submitWrap}>
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

      {/* GitHub Username Connect Modal */}
      <Modal
        visible={showGithubModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGithubModal(false)}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <Code2 size={18} color={colors.text} strokeWidth={1.75} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {profileSetupCopy.githubConnect.modalTitle}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setShowGithubModal(false)}
                style={styles.closeButton}
              >
                <X size={16} color={colors.textSecondary} strokeWidth={1.75} />
              </Pressable>
            </View>

            <Text
              style={[styles.modalSubtitle, { color: colors.textSecondary }]}
            >
              {profileSetupCopy.githubConnect.modalSubtitle}
            </Text>

            <TextField
              label="GitHub Username"
              placeholder={
                profileSetupCopy.githubConnect.modalInputPlaceholder
              }
              autoCapitalize="none"
              autoCorrect={false}
              value={githubUsernameInput}
              onChangeText={(text) => {
                setGithubUsernameInput(text);
                if (githubModalError) setGithubModalError(null);
              }}
              error={githubModalError}
            />

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => setShowGithubModal(false)}
                disabled={isFetchingUsername}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>
                  {profileSetupCopy.githubConnect.modalCancel}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.modalSubmitButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: isFetchingUsername ? 0.6 : pressed ? 0.88 : 1,
                  },
                ]}
                onPress={handleFetchGithubUsername}
                disabled={isFetchingUsername}
              >
                {isFetchingUsername ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text
                    style={[
                      styles.modalSubmitText,
                      { color: colors.onPrimary },
                    ]}
                  >
                    {profileSetupCopy.githubConnect.modalSubmit}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  sectionContainer: {
    gap: tokens.spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  connectedText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  githubButton: {
    height: 40,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
  },
  githubButtonText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  inputRightIcon: {
    marginRight: tokens.spacing.sm + 4,
  },
  sectionDivider: {
    height: 1,
    width: "100%",
    marginVertical: tokens.spacing.xs,
  },
  submitWrap: {
    marginTop: tokens.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    ...tokens.shadow.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  modalTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    letterSpacing: -0.2,
  },
  closeButton: {
    padding: tokens.spacing.xs,
  },
  modalSubtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  modalCancelButton: {
    height: 36,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  modalSubmitButton: {
    height: 36,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 120,
  },
  modalSubmitText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
});
