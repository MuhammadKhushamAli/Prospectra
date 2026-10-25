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
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Briefcase size={28} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        No Projects Added Yet
      </Text>

      <Text style={[styles.subtitle, { color: colors.placeholder }]}>
        {hasGithub
          ? "No repositories were found or selected from GitHub. You can add your flagship projects manually below."
          : "Add your key software, engineering, or client projects so Prospectra can pitch your relevant work during outreach."}
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.addButton,
          {
            backgroundColor: colors.primary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={onAddProject}
      >
        <Plus size={16} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add Your First Project</Text>
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
    marginVertical: tokens.spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.spacing.xs,
  },
  title: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.md,
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
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    marginTop: tokens.spacing.xs,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.sm,
  },
});
