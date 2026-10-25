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
import { Check, Plus, Sparkles, X } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import TextField from "../ui/TextField";
import { validateProjectForm } from "../../validation/projectValidation";
import type { ProjectFormValues, ProjectModalProps } from "../../types/projects";

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
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isEditing ? "Edit Project" : "Add New Project"}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.placeholder} />
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
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
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
                      style={[styles.counterText, { color: colors.primary }]}
                    >
                      {techStack.length}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Add Tech Input - immediately below heading */}
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
                  style={[
                    styles.addTechButton,
                    {
                      backgroundColor: newTechInput.trim()
                        ? colors.primary
                        : colors.surfaceElevated,
                      borderColor: colors.border,
                      opacity: newTechInput.trim() ? 1 : 0.6,
                    },
                  ]}
                  onPress={handleAddTech}
                  disabled={!newTechInput.trim()}
                >
                  <Plus
                    size={16}
                    color={
                      newTechInput.trim() ? "#FFFFFF" : colors.textSecondary
                    }
                  />
                </Pressable>
              </View>

              {/* Selected Tech Chips (shown only when techStack has items) */}
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
                        onPress={() => handleRemoveTech(tech)}
                        hitSlop={6}
                        style={styles.chipRemove}
                      >
                        <X size={12} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Suggestions / Hints */}
              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionsHeader}>
                  <Sparkles size={12} color={colors.primary} />
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
                        key={suggestion}
                        onPress={() => handleToggleSuggestion(suggestion)}
                        style={({ pressed }) => [
                          styles.suggestionChip,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.surfaceElevated,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.border,
                            opacity: pressed ? 0.75 : 1,
                          },
                        ]}
                      >
                        {isSelected ? (
                          <Check size={11} color="#FFFFFF" />
                        ) : (
                          <Plus size={11} color={colors.textSecondary} />
                        )}
                        <Text
                          style={[
                            styles.suggestionChipText,
                            {
                              color: isSelected
                                ? "#FFFFFF"
                                : colors.textSecondary,
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
          <View style={styles.modalActions}>
            <Pressable
              style={[
                styles.cancelButton,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>
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
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.spacing.md,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "90%",
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
  modalTitle: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.lg,
  },
  closeButton: {
    padding: 4,
  },
  scrollArea: {
    flexGrow: 0,
    maxHeight: 520,
  },
  formContent: {
    gap: tokens.spacing.md,
    paddingBottom: tokens.spacing.xs,
  },
  textAreaWrap: {
    minHeight: 120,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
  },
  techStackContainer: {
    gap: 6,
  },
  techStackHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
  },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  counterText: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xs,
  },
  addTechRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  addTechInputWrap: {
    flex: 1,
  },
  addTechButton: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs,
    paddingTop: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 5,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
  chipRemove: {
    padding: 2,
  },
  suggestionsContainer: {
    marginTop: 4,
    gap: 6,
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  suggestionsLabel: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
  },
  suggestionsChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  suggestionChipText: {
    fontFamily: "DMSans",
    fontSize: 11,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  cancelButton: {
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
  },
  saveButton: {
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
  },
});
