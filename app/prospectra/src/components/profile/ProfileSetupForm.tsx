import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Check, Code2, Globe, Link2, X } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import { profileSetupCopy } from "../../constants/constants";
import {
  validateGithubUrl,
  validateLinkedinUrl,
  validateProfileFullName,
  validateProfileHeadline,
} from "../../validation/profileValidation";
import { fetchGitHubProfileByUsername } from "../../services/githubAuthService";
import type { ProfileSetupFormProps } from "../../types/profile";
import ProfileSkillsSection from "./ProfileSkillsSection";

export type { ProfileSetupFormProps };

export default function ProfileSetupForm({
  initialFullName = "",
  initialHeadline = "",
  initialSkills = [],
  initialGithubUrl = "",
  initialLinkedinUrl = "",
  onSubmit,
  isLoading = false,
}: ProfileSetupFormProps) {
  const colors = useTheme();

  const [fullName, setFullName] = useState(initialFullName);
  const [headline, setHeadline] = useState(initialHeadline);
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [githubUrl, setGithubUrl] = useState(initialGithubUrl);
  const [linkedinUrl, setLinkedinUrl] = useState(
    initialLinkedinUrl || "https://linkedin.com/in/",
  );

  // Field validation errors
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [headlineError, setHeadlineError] = useState<string | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);

  // GitHub connection modal state
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubUsernameInput, setGithubUsernameInput] = useState("");
  const [githubModalError, setGithubModalError] = useState<string | null>(null);
  const [isFetchingUsername, setIsFetchingUsername] = useState(false);

  useEffect(() => {
    if (initialFullName) {
      setFullName(initialFullName);
    }
  }, [initialFullName]);

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

  const handleFullNameChange = (text: string) => {
    setFullName(text);
    if (fullNameError) setFullNameError(null);
  };

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

  // Option 1: Connect GitHub via username using GitHub public API
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
    const nameErr = validateProfileFullName(fullName);
    const headErr = validateProfileHeadline(headline);
    const ghErr = validateGithubUrl(githubUrl);
    const inErr = validateLinkedinUrl(linkedinUrl);

    if (nameErr || headErr || ghErr || inErr) {
      setFullNameError(nameErr);
      setHeadlineError(headErr);
      setGithubError(ghErr);
      setLinkedinError(inErr);
      return;
    }

    setFullNameError(null);
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
    if (!finalLinkedinUrl || emptyPrefixes.includes(finalLinkedinUrl.toLowerCase())) {
      finalLinkedinUrl = "";
    } else if (!/^https?:\/\//i.test(finalLinkedinUrl)) {
      finalLinkedinUrl = `https://${finalLinkedinUrl}`;
    }

    onSubmit?.({
      fullName: fullName.trim(),
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
    <View style={styles.form}>
      {/* 1. Full Name */}
      <TextField
        label={`${profileSetupCopy.fields.fullName} *`}
        placeholder={profileSetupCopy.placeholders.fullName}
        keyboardType="default"
        autoCapitalize="words"
        autoCorrect={false}
        value={fullName}
        onChangeText={handleFullNameChange}
        editable={!isLoading}
        error={fullNameError}
      />

      {/* 2. Professional Headline */}
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

      {/* 2. GitHub Profile Section (Option 1: Connect GitHub Button, Option 2: Manual URL) */}
      <View style={styles.sectionContainer}>
        <View style={styles.labelRow}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            {`${profileSetupCopy.fields.githubUrl} (Optional)`}
          </Text>
          {isGithubConnected ? (
            <View style={[styles.connectedBadge, { backgroundColor: colors.surface }]}>
              <Check size={12} color={colors.primary} />
              <Text style={[styles.connectedText, { color: colors.primary }]}>
                {profileSetupCopy.githubConnect.connected}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Option 1: Connect GitHub Button */}
        <Pressable
          style={({ pressed }) => [
            styles.githubButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: isLoading ? 0.7 : pressed ? 0.85 : 1,
            },
          ]}
          onPress={handleConnectGithub}
          disabled={isLoading}
        >
          <Code2 size={18} color={colors.text} />
          <Text style={[styles.githubButtonText, { color: colors.text }]}>
            {profileSetupCopy.githubConnect.button}
          </Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.placeholder }]}>
            {profileSetupCopy.githubConnect.orManual}
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Option 2: GitHub URL Input */}
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
              <Check size={16} color={colors.primary} style={styles.inputRightIcon} />
            ) : null
          }
        />
      </View>

      {/* 3. LinkedIn Profile Section (Optional with prefix filled) */}
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
            <Link2 size={16} color={colors.placeholder} style={styles.inputRightIcon} />
          }
        />
      </View>

      {/* 4. Skills Section */}
      <ProfileSkillsSection
        skills={skills}
        onAddSkill={handleAddSkill}
        onRemoveSkill={handleRemoveSkill}
        editable={!isLoading}
      />

      {/* 5. Submit Button */}
      <Button
        label={
          isLoading
            ? profileSetupCopy.actions.submitting
            : profileSetupCopy.actions.submit
        }
        onPress={handleSubmit}
        disabled={isLoading}
      />

      {/* GitHub Username Connect Modal */}
      <Modal
        visible={showGithubModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGithubModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <Code2 size={20} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {profileSetupCopy.githubConnect.modalTitle}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowGithubModal(false)}
                style={styles.closeButton}
              >
                <X size={18} color={colors.placeholder} />
              </Pressable>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.placeholder }]}>
              {profileSetupCopy.githubConnect.modalSubtitle}
            </Text>

            <TextField
              label="GitHub Username"
              placeholder={profileSetupCopy.githubConnect.modalInputPlaceholder}
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
                style={[styles.modalCancelButton, { borderColor: colors.border }]}
                onPress={() => setShowGithubModal(false)}
                disabled={isFetchingUsername}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>
                  {profileSetupCopy.githubConnect.modalCancel}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalSubmitButton,
                  { backgroundColor: colors.primary },
                  isFetchingUsername && styles.buttonDisabled,
                ]}
                onPress={handleFetchGithubUsername}
                disabled={isFetchingUsername}
              >
                {isFetchingUsername ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>
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
  form: { gap: tokens.spacing.md },
  sectionContainer: {
    gap: tokens.spacing.xs,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  connectedText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
  githubButton: {
    height: 48,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
  },
  githubButtonText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    marginVertical: tokens.spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
  },
  inputRightIcon: {
    marginRight: tokens.spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
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
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.md,
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  modalCancelButton: {
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
  },
  modalCancelText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
  },
  modalSubmitButton: {
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 120,
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
