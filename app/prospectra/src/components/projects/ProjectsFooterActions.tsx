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
        style={({ pressed }) => [
          styles.outlineAddButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: isLoading ? 0.6 : pressed ? 0.8 : 1,
          },
        ]}
        onPress={onAddProject}
        disabled={isLoading}
      >
        <Plus size={16} color={colors.text} />
        <Text style={[styles.outlineAddButtonText, { color: colors.text }]}>
          Add Project
        </Text>
      </Pressable>

      {/* Primary Submit Button */}
      <Button
        label={isLoading ? "Saving projects..." : "Continue to target industries"}
        onPress={onSubmit}
        disabled={isLoading || !canSubmit}
      />

      {/* Skip Option */}
      {onSkip ? (
        <Pressable
          style={({ pressed }) => [
            styles.skipButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={onSkip}
          disabled={isLoading}
        >
          <Text style={[styles.skipText, { color: colors.placeholder }]}>
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
    marginTop: tokens.spacing.md,
  },
  outlineAddButton: {
    height: 48,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs,
  },
  outlineAddButtonText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
  },
  skipButton: {
    alignSelf: "center",
    paddingVertical: tokens.spacing.xs,
    marginTop: tokens.spacing.xs,
  },
  skipText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
    textDecorationLine: "underline",
  },
});
