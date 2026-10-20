import { useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check, Plus, Sparkles, X } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { skillsCopy } from "../../constants/constants";
import { validateSkillName } from "../../validation/skillsValidation";
import {
  defaultSkillSuggestions,
  type ProfileSkillsSectionProps,
} from "../../types/skills";

export default function ProfileSkillsSection({
  skills,
  onAddSkill,
  onRemoveSkill,
  editable = true,
}: ProfileSkillsSectionProps) {
  const colors = useTheme();
  const [skillInput, setSkillInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleInputChange = (text: string) => {
    setSkillInput(text);
    if (error) {
      setError(null);
    }
  };

  const handleAddCustomSkill = () => {
    const validationError = validateSkillName(skillInput, skills);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onAddSkill(skillInput.trim());
    setSkillInput("");
    Keyboard.dismiss();
  };

  const handleToggleSuggestion = (suggestion: string) => {
    if (!editable) return;
    const exists = skills.some(
      (s) => s.toLowerCase() === suggestion.toLowerCase(),
    );
    if (exists) {
      onRemoveSkill(suggestion);
    } else {
      setError(null);
      onAddSkill(suggestion);
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {skillsCopy.sectionTitle}
          </Text>
          <Text
            style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
          >
            {skillsCopy.sectionSubtitle}
          </Text>
        </View>
        {skills.length > 0 ? (
          <View
            style={[
              styles.counterBadge,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.counterText, { color: colors.primary }]}>
              {skills.length}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Input row */}
      <View style={styles.inputSection}>
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: colors.surface,
              borderColor: error
                ? colors.error
                : isFocused
                  ? colors.primary
                  : colors.border,
            },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={skillsCopy.placeholder}
            placeholderTextColor={colors.textSecondary}
            value={skillInput}
            onChangeText={handleInputChange}
            onSubmitEditing={handleAddCustomSkill}
            returnKeyType="done"
            editable={editable}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Pressable
            onPress={handleAddCustomSkill}
            disabled={!editable || !skillInput.trim()}
            style={({ pressed }) => [
              styles.addBtn,
              {
                backgroundColor:
                  skillInput.trim().length > 0
                    ? colors.primary
                    : colors.surfaceElevated,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : skillInput.trim().length > 0 ? 1 : 0.5,
              },
            ]}
          >
            <Plus
              size={14}
              color={
                skillInput.trim().length > 0
                  ? colors.onPrimary
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.addBtnText,
                {
                  color:
                    skillInput.trim().length > 0
                      ? colors.onPrimary
                      : colors.textSecondary,
                },
              ]}
            >
              {skillsCopy.addButton}
            </Text>
          </Pressable>
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        ) : null}
      </View>

      {/* Selected Skills Chips */}
      {skills.length > 0 ? (
        <View style={styles.chipsContainer}>
          {skills.map((skill) => (
            <View
              key={skill}
              style={[
                styles.skillChip,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.skillChipText, { color: colors.text }]}>
                {skill}
              </Text>
              {editable ? (
                <Pressable
                  onPress={() => onRemoveSkill(skill)}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.removeBtn,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <X size={12} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <View
          style={[
            styles.emptyWrap,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {skillsCopy.emptySkillsText}
          </Text>
        </View>
      )}

      {/* Suggested Skills */}
      <View style={styles.suggestionsWrap}>
        <View style={styles.suggestionsHeader}>
          <Sparkles size={13} color={colors.primary} />
          <Text
            style={[styles.suggestionsTitle, { color: colors.textSecondary }]}
          >
            {skillsCopy.suggestionsTitle}
          </Text>
        </View>
        <View style={styles.suggestionsChips}>
          {defaultSkillSuggestions.map((suggestion) => {
            const isSelected = skills.some(
              (s) => s.toLowerCase() === suggestion.toLowerCase(),
            );
            return (
              <Pressable
                key={suggestion}
                onPress={() => handleToggleSuggestion(suggestion)}
                disabled={!editable}
                style={({ pressed }) => [
                  styles.suggestionChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.surfaceElevated,
                    borderColor: isSelected ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                {isSelected ? (
                  <Check size={11} color={colors.onPrimary} />
                ) : (
                  <Plus size={11} color={colors.textSecondary} />
                )}
                <Text
                  style={[
                    styles.suggestionText,
                    {
                      color: isSelected
                        ? colors.onPrimary
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
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: tokens.spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
  },
  sectionSubtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  counterBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  counterText: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.xs,
  },
  inputSection: {
    gap: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    gap: tokens.spacing.xs,
  },
  input: {
    flex: 1,
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    paddingVertical: tokens.spacing.xs,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  addBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
  errorText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    marginTop: 2,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs,
    minHeight: 32,
    alignItems: "center",
  },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  skillChipText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
  removeBtn: {
    padding: 1,
  },
  emptyWrap: {
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    textAlign: "center",
  },
  suggestionsWrap: {
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.xs,
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  suggestionsTitle: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
  suggestionsChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  suggestionText: {
    fontFamily: "DMSans",
    fontSize: 11,
  },
});
