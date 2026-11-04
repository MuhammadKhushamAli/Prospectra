import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Check, Layers, Plus, X } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import TextField from "../ui/TextField";
import { validateProjectForm } from "../../validation/projectValidation";
import type {
  ProjectFormValues,
  ProjectModalProps,
} from "../../types/projects";

const DEFAULT_TECH_SUGGESTIONS = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "Python",
  "FastAPI",
  "PostgreSQL",
  "Tailwind CSS",
  "GraphQL",
  "Docker",
  "AWS",
  "Redis",
  "MongoDB",
  "Supabase",
] as const;

export default function ProjectModal({
  visible,
  project,
  onClose,
  onSave,
}: ProjectModalProps) {
  const colors = useTheme();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [newTechInput, setNewTechInput] = useState("");
  const [liveDemoUrl, setLiveDemoUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");

  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    liveDemoUrl?: string;
  }>({});

  useEffect(() => {
    if (project) {
      setTitle(project.title || "");
      setDescription(project.description || "");
      setTechStack(project.techStack || []);
      setLiveDemoUrl(project.liveDemoUrl || "");
      setRepoUrl(project.repoUrl || "");
    } else {
      setTitle("");
      setDescription("");
      setTechStack([]);
      setLiveDemoUrl("");
      setRepoUrl("");
    }
    setNewTechInput("");
    setErrors({});
  }, [project, visible]);

  const handleAddTech = () => {
    const clean = newTechInput.trim();
    if (!clean) return;
    if (!techStack.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setTechStack((prev) => [...prev, clean]);
    }
    setNewTechInput("");
  };

  const handleRemoveTech = (techToRemove: string) => {
    setTechStack((prev) =>
      prev.filter((t) => t.toLowerCase() !== techToRemove.toLowerCase()),
    );
  };

  const handleToggleSuggestion = (tech: string) => {
    const exists = techStack.some(
      (t) => t.toLowerCase() === tech.toLowerCase(),
    );
    if (exists) {
      setTechStack((prev) =>
        prev.filter((t) => t.toLowerCase() !== tech.toLowerCase()),
      );
    } else {
      setTechStack((prev) => [...prev, tech]);
    }
  };

  const handleSave = () => {
    const values: ProjectFormValues = {
      title: title.trim(),
      description: description.trim(),
      techStack,
      liveDemoUrl: liveDemoUrl.trim() || undefined,
      repoUrl: repoUrl.trim() || undefined,
    };

    const validationErrors = validateProjectForm(values);
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    onSave(values, project?.id);
    onClose();
  };

  const isEditing = Boolean(project);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
      >
        <View
          style={[
            styles.modalCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isEditing ? "Edit Project" : "Add New Project"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.closeButton}
            >
              <X size={18} color={colors.textSecondary} strokeWidth={1.75} />
            </Pressable>
          </View>

          {/* Form Content */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <TextField
              label="Project Title *"
              placeholder="e.g. Next.js SaaS Platform"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errors.title)
                  setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              error={errors.title}
            />

            {/* Description */}
            <TextField
              label="Project Description *"
              placeholder="Describe what the project does, key technical architecture, and business value delivered..."
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (errors.description)
                  setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              error={errors.description}
              inputWrapStyle={styles.textAreaWrap}
              style={styles.textArea}
            />

            {/* Tech Stack */}
            <View style={styles.techStackContainer}>
              <View style={styles.techStackHeader}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  Tech Stack
                </Text>
                {techStack.length > 0 ? (
                  <View
                    style={[
                      styles.counterBadge,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.counterText, { color: colors.text }]}
                    >
                      {techStack.length}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.addTechRow}>
                <View style={styles.addTechInputWrap}>
                  <TextField
                    placeholder="Add technology (e.g. React, PostgreSQL)"
                    value={newTechInput}
                    onChangeText={setNewTechInput}
                    onSubmitEditing={handleAddTech}
                    returnKeyType="done"
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add technology"
                  style={[
                    styles.addTechButton,
                    {
                      backgroundColor: newTechInput.trim()
                        ? colors.primary
                        : colors.surfaceElevated,
                      borderColor: newTechInput.trim()
                        ? colors.primary
                        : colors.border,
                      opacity: newTechInput.trim() ? 1 : 0.5,
                    },
                  ]}
                  onPress={handleAddTech}
                  disabled={!newTechInput.trim()}
                >
                  <Plus
                    size={16}
                    strokeWidth={1.75}
                    color={
                      newTechInput.trim()
                        ? colors.onPrimary
                        : colors.textSecondary
                    }
                  />
                </Pressable>
              </View>

              {techStack.length > 0 ? (
                <View style={styles.chipsWrap}>
                  {techStack.map((tech) => (
                    <View
                      key={tech}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: colors.text }]}>
                        {tech}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${tech}`}
                        onPress={() => handleRemoveTech(tech)}
                        hitSlop={6}
                        style={styles.chipRemove}
                      >
                        <X
                          size={12}
                          color={colors.textSecondary}
                          strokeWidth={1.75}
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionsHeader}>
                  <Layers
                    size={12}
                    color={colors.textSecondary}
                    strokeWidth={1.75}
                  />
                  <Text
                    style={[
                      styles.suggestionsLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Suggested technologies (tap to add)
                  </Text>
                </View>
                <View style={styles.suggestionsChipsWrap}>
                  {DEFAULT_TECH_SUGGESTIONS.map((suggestion) => {
                    const isSelected = techStack.some(
                      (t) => t.toLowerCase() === suggestion.toLowerCase(),
                    );
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        key={suggestion}
                        onPress={() => handleToggleSuggestion(suggestion)}
                        style={({ pressed }) => [
                          styles.suggestionChip,
                          {
                            backgroundColor: isSelected
                              ? colors.primarySoft
                              : colors.surface,
                            borderColor: isSelected
                              ? colors.primaryBorder
                              : colors.border,
                            opacity: pressed ? 0.75 : 1,
                          },
                        ]}
                      >
                        {isSelected ? (
                          <Check
                            size={12}
                            color={colors.primary}
                            strokeWidth={1.75}
                          />
                        ) : (
                          <Plus
                            size={12}
                            color={colors.textSecondary}
                            strokeWidth={1.75}
                          />
                        )}
                        <Text
                          style={[
                            styles.suggestionChipText,
                            {
                              color: isSelected
                                ? colors.primary
                                : colors.textSecondary,
                              fontFamily: isSelected
                                ? "DMSansMedium"
                                : "DMSans",
                            },
                          ]}
                        >
                          {suggestion}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Live Demo URL */}
            <TextField
              label="Live Demo URL (Optional)"
              placeholder="https://example.com"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              value={liveDemoUrl}
              onChangeText={(text) => {
                setLiveDemoUrl(text);
                if (errors.liveDemoUrl)
                  setErrors((prev) => ({ ...prev, liveDemoUrl: undefined }));
              }}
              error={errors.liveDemoUrl}
            />

            {/* Repository URL */}
            <TextField
              label="Repository URL (Optional)"
              placeholder="https://github.com/user/project"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              value={repoUrl}
              onChangeText={setRepoUrl}
            />
          </ScrollView>

          {/* Modal Actions */}
          <View
            style={[
              styles.modalActions,
              { borderTopColor: colors.border },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.cancelButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.saveButton,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
              onPress={handleSave}
            >
              <Text
                style={[styles.saveButtonText, { color: colors.onPrimary }]}
              >
                {isEditing ? "Save Changes" : "Add Project"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "90%",
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
    ...tokens.shadow.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    letterSpacing: -0.2,
  },
  closeButton: {
    padding: tokens.spacing.xs,
  },
  scrollArea: {
    flexGrow: 0,
    maxHeight: 500,
  },
  formContent: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  textAreaWrap: {
    minHeight: 112,
  },
  textArea: {
    minHeight: 104,
    textAlignVertical: "top",
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
  },
  techStackContainer: {
    gap: tokens.spacing.sm,
  },
  techStackHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  counterBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  counterText: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  addTechRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  addTechInputWrap: {
    flex: 1,
  },
  addTechButton: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs + 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  chipRemove: {
    padding: 2,
  },
  suggestionsContainer: {
    marginTop: tokens.spacing.xs,
    gap: tokens.spacing.sm,
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  suggestionsLabel: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  suggestionsChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs + 2,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
  },
  suggestionChipText: {
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderTopWidth: 1,
  },
  cancelButton: {
    height: 36,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  saveButton: {
    height: 36,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
});
