import { useEffect, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Building2, Check, Plus, Target, X } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import Button from "../ui/Button";
import { defaultIndustrySuggestions } from "../../constants/industries";
import { targetIndustriesCopy } from "../../constants/constants";
import type { TargetIndustriesFormProps } from "../../types/industries";

export default function TargetIndustriesForm({
  initialIndustries = [],
  onSubmit,
  isLoading = false,
}: TargetIndustriesFormProps) {
  const colors = useTheme();
  const [selectedIndustries, setSelectedIndustries] =
    useState<string[]>(initialIndustries);
  const [customInput, setCustomInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setSelectedIndustries(initialIndustries);
  }, [initialIndustries]);

  const handleToggleIndustry = (industry: string) => {
    if (isLoading) return;
    setError(null);
    setSelectedIndustries((prev) => {
      const exists = prev.some(
        (item) => item.toLowerCase() === industry.toLowerCase(),
      );
      if (exists) {
        return prev.filter(
          (item) => item.toLowerCase() !== industry.toLowerCase(),
        );
      } else {
        return [...prev, industry];
      }
    });
  };

  const handleAddCustomIndustry = () => {
    const trimmed = customInput.trim();
    if (!trimmed) {
      setError(targetIndustriesCopy.validation.tooShort);
      return;
    }
    if (trimmed.length < 2) {
      setError(targetIndustriesCopy.validation.tooShort);
      return;
    }
    if (trimmed.length > 60) {
      setError(targetIndustriesCopy.validation.tooLong);
      return;
    }

    const alreadyExists = selectedIndustries.some(
      (item) => item.toLowerCase() === trimmed.toLowerCase(),
    );
    if (alreadyExists) {
      setError(targetIndustriesCopy.validation.duplicate);
      return;
    }

    setError(null);
    setSelectedIndustries((prev) => [...prev, trimmed]);
    setCustomInput("");
    Keyboard.dismiss();
  };

  const handleRemoveIndustry = (industryToRemove: string) => {
    if (isLoading) return;
    setSelectedIndustries((prev) =>
      prev.filter((i) => i.toLowerCase() !== industryToRemove.toLowerCase()),
    );
  };

  const handleSubmit = () => {
    if (selectedIndustries.length === 0) {
      setError(targetIndustriesCopy.validation.minOneRequired);
      return;
    }
    setError(null);
    onSubmit?.(selectedIndustries);
  };

  return (
    <View style={styles.container}>
      {/* Selected Counter & Chips */}
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.summaryHeader}>
          <View style={styles.summaryTitleRow}>
            <Target
              size={14}
              color={colors.textSecondary}
              strokeWidth={1.75}
            />
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              {targetIndustriesCopy.selectedTitle}
            </Text>
          </View>
          <View
            style={[
              styles.countPill,
              {
                backgroundColor:
                  selectedIndustries.length > 0
                    ? colors.primarySoft
                    : colors.surfaceElevated,
                borderColor:
                  selectedIndustries.length > 0
                    ? colors.primaryBorder
                    : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.countPillText,
                {
                  color:
                    selectedIndustries.length > 0
                      ? colors.primary
                      : colors.textSecondary,
                },
              ]}
            >
              {selectedIndustries.length} {targetIndustriesCopy.selectedCount}
            </Text>
          </View>
        </View>

        {selectedIndustries.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {targetIndustriesCopy.emptySelected}
          </Text>
        ) : (
          <View style={styles.selectedChipsWrap}>
            {selectedIndustries.map((ind) => (
              <View
                key={ind}
                style={[
                  styles.activeChip,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.activeChipText, { color: colors.text }]}>
                  {ind}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${ind}`}
                  onPress={() => handleRemoveIndustry(ind)}
                  disabled={isLoading}
                  hitSlop={6}
                  style={styles.chipRemoveBtn}
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
        )}
      </View>

      {/* Custom Industry Input */}
      <View
        style={[
          styles.customCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          {targetIndustriesCopy.customLabel}
        </Text>
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
            placeholder={targetIndustriesCopy.customPlaceholder}
            placeholderTextColor={colors.placeholder}
            value={customInput}
            onChangeText={(text) => {
              setCustomInput(text);
              if (error) setError(null);
            }}
            onSubmitEditing={handleAddCustomIndustry}
            returnKeyType="done"
            editable={!isLoading}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Pressable
            accessibilityRole="button"
            onPress={handleAddCustomIndustry}
            disabled={isLoading || !customInput.trim()}
            style={({ pressed }) => [
              styles.addBtn,
              {
                backgroundColor:
                  customInput.trim().length > 0
                    ? colors.primary
                    : colors.surfaceElevated,
                borderColor:
                  customInput.trim().length > 0
                    ? colors.primary
                    : colors.border,
                opacity: pressed
                  ? 0.75
                  : customInput.trim().length > 0
                    ? 1
                    : 0.5,
              },
            ]}
          >
            <Plus
              size={14}
              strokeWidth={1.75}
              color={
                customInput.trim().length > 0
                  ? colors.onPrimary
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.addBtnText,
                {
                  color:
                    customInput.trim().length > 0
                      ? colors.onPrimary
                      : colors.textSecondary,
                },
              ]}
            >
              {targetIndustriesCopy.addButton}
            </Text>
          </Pressable>
        </View>
        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        ) : null}
      </View>

      {/* Suggested Industry Grid */}
      <View style={styles.suggestionsSection}>
        <View style={styles.suggestionsHeader}>
          <Building2
            size={14}
            color={colors.textSecondary}
            strokeWidth={1.75}
          />
          <Text style={[styles.suggestionsTitle, { color: colors.text }]}>
            {targetIndustriesCopy.popularTitle}
          </Text>
        </View>

        <View style={styles.grid}>
          {defaultIndustrySuggestions.map((suggestion) => {
            const isSelected = selectedIndustries.some(
              (i) => i.toLowerCase() === suggestion.toLowerCase(),
            );
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                key={suggestion}
                onPress={() => handleToggleIndustry(suggestion)}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: isSelected
                      ? colors.primarySoft
                      : colors.surface,
                    borderColor: isSelected
                      ? colors.primary
                      : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.optionContent}>
                  <View
                    style={[
                      styles.checkCircle,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.surface,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    {isSelected ? (
                      <Check
                        size={11}
                        color={colors.onPrimary}
                        strokeWidth={2.5}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: colors.text,
                        fontFamily: isSelected ? "DMSansMedium" : "DMSans",
                      },
                    ]}
                  >
                    {suggestion}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Submit Button */}
      <View style={styles.actionWrap}>
        <Button
          label={
            isLoading
              ? targetIndustriesCopy.actions.submitting
              : targetIndustriesCopy.actions.submit
          }
          onPress={handleSubmit}
          disabled={isLoading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.md,
  },
  summaryCard: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    gap: tokens.spacing.sm + 4,
    ...tokens.shadow.sm,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: tokens.spacing.xs + 2,
  },
  summaryTitleRow: {
    flex: 1,
    minWidth: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
  },
  summaryTitle: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
    flexShrink: 1,
  },
  countPill: {
    flexShrink: 0,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  countPillText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  emptyText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  selectedChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs + 2,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
  },
  activeChipText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  chipRemoveBtn: {
    padding: 2,
  },
  customCard: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    gap: tokens.spacing.sm,
    ...tokens.shadow.sm,
  },
  inputLabel: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  inputRow: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingLeft: tokens.spacing.sm + 4,
    paddingRight: tokens.spacing.xs,
    gap: tokens.spacing.xs,
  },
  input: {
    flex: 1,
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
    paddingVertical: tokens.spacing.xs,
  },
  addBtn: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
  },
  addBtnText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  errorText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  suggestionsSection: {
    gap: tokens.spacing.sm,
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
  },
  suggestionsTitle: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  grid: {
    gap: tokens.spacing.xs + 2,
  },
  optionCard: {
    paddingVertical: tokens.spacing.sm + 2,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm + 2,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
    flexShrink: 1,
  },
  actionWrap: {
    marginTop: tokens.spacing.xs,
  },
});
