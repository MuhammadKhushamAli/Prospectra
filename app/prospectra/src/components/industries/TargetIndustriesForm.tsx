import { useEffect, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check, Plus, Sparkles, Target, X } from "lucide-react-native";

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
            borderColor: selectedIndustries.length > 0 ? colors.primary : colors.border,
          },
        ]}
      >
        <View style={styles.summaryHeader}>
          <View style={styles.summaryTitleRow}>
            <Target size={16} color={colors.primary} />
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
                    ? colors.primary
                    : colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.countPillText,
                {
                  color:
                    selectedIndustries.length > 0
                      ? colors.onPrimary
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
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text style={[styles.activeChipText, { color: colors.text }]}>
                  {ind}
                </Text>
                <Pressable
                  onPress={() => handleRemoveIndustry(ind)}
                  disabled={isLoading}
                  hitSlop={6}
                  style={styles.chipRemoveBtn}
                >
                  <X size={13} color={colors.textSecondary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Custom Industry Input */}
      <View style={styles.customSection}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
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
            placeholderTextColor={colors.textSecondary}
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
            onPress={handleAddCustomIndustry}
            disabled={isLoading || !customInput.trim()}
            style={({ pressed }) => [
              styles.addBtn,
              {
                backgroundColor:
                  customInput.trim().length > 0
                    ? colors.primary
                    : colors.surfaceElevated,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : customInput.trim().length > 0 ? 1 : 0.5,
              },
            ]}
          >
            <Plus
              size={14}
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
          <Sparkles size={15} color={colors.secondary} />
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
                key={suggestion}
                onPress={() => handleToggleIndustry(suggestion)}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.optionContent}>
                  <View
                    style={[
                      styles.checkCircle,
                      {
                        backgroundColor: isSelected
                          ? colors.onPrimary
                          : colors.surfaceElevated,
                        borderColor: isSelected
                          ? colors.onPrimary
                          : colors.border,
                      },
                    ]}
                  >
                    {isSelected ? (
                      <Check size={12} color={colors.primary} strokeWidth={3} />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: isSelected ? colors.onPrimary : colors.text,
                        fontFamily: isSelected
                          ? "DMSansSemiBold"
                          : "DMSansMedium",
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
    gap: tokens.spacing.lg,
  },
  summaryCard: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    gap: tokens.spacing.sm,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  summaryTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
  },
  countPill: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  countPillText: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.xs,
  },
  emptyText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 18,
  },
  selectedChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingLeft: tokens.spacing.sm,
    paddingRight: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  activeChipText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
  chipRemoveBtn: {
    padding: 2,
    borderRadius: tokens.radius.full,
  },
  customSection: {
    gap: tokens.spacing.xs,
  },
  inputLabel: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
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
    paddingVertical: 6,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  addBtnText: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xs,
  },
  errorText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    marginTop: 2,
  },
  suggestionsSection: {
    gap: tokens.spacing.sm,
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  suggestionsTitle: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.sm,
  },
  grid: {
    gap: tokens.spacing.xs,
  },
  optionCard: {
    paddingVertical: 10,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: tokens.radius.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontSize: tokens.fontSize.sm,
    flexShrink: 1,
  },
  actionWrap: {
    marginTop: tokens.spacing.sm,
  },
});
