import { Pressable, StyleSheet, Text, View } from "react-native";
import { Plus } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import Button from "../ui/Button";
import type { ProjectsFooterActionsProps } from "../../types/projects";

export default function ProjectsFooterActions({
  onAddProject,
  onSubmit,
  onSkip,
  isLoading = false,
  canSubmit = true,
}: ProjectsFooterActionsProps) {
  const colors = useTheme();

  return (
    <View style={styles.container}>
      {/* Add Project Action Button */}
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.outlineAddButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: isLoading ? 0.45 : pressed ? 0.8 : 1,
          },
        ]}
        onPress={onAddProject}
        disabled={isLoading}
      >
        <Plus size={15} color={colors.text} strokeWidth={1.75} />
        <Text style={[styles.outlineAddButtonText, { color: colors.text }]}>
          Add Project
        </Text>
      </Pressable>

      {/* Primary Submit Button */}
      <Button
        label={
          isLoading ? "Saving projects..." : "Continue to target industries"
        }
        onPress={onSubmit}
        disabled={isLoading || !canSubmit}
      />

      {/* Skip Option */}
      {onSkip ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.skipButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={onSkip}
          disabled={isLoading}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            Skip this step for now
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.lg,
  },
  outlineAddButton: {
    height: 40,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs + 2,
    ...tokens.shadow.sm,
  },
  outlineAddButtonText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  skipButton: {
    alignSelf: "center",
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  skipText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
});
