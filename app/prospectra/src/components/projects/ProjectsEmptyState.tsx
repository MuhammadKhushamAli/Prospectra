import { Pressable, StyleSheet, Text, View } from "react-native";
import { Briefcase, Plus } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";

interface ProjectsEmptyStateProps {
  onAddProject: () => void;
  hasGithub?: boolean;
}

export default function ProjectsEmptyState({
  onAddProject,
  hasGithub = false,
}: ProjectsEmptyStateProps) {
  const colors = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        <Briefcase size={20} color={colors.textSecondary} strokeWidth={1.75} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        No Projects Added Yet
      </Text>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {hasGithub
          ? "No repositories were found or selected from GitHub. You can add your flagship projects manually below."
          : "Add your key software, engineering, or client projects so Prospectra can pitch your relevant work during outreach."}
      </Text>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.addButton,
          {
            backgroundColor: colors.primary,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
        onPress={onAddProject}
      >
        <Plus size={14} color={colors.onPrimary} strokeWidth={1.75} />
        <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>
          Add Your First Project
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.sm,
    ...tokens.shadow.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.spacing.xs,
  },
  title: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    lineHeight: 22,
    letterSpacing: -0.2,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  addButton: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    marginTop: tokens.spacing.xs,
  },
  addButtonText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
});
