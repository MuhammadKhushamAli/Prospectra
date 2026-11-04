import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Code2, ExternalLink, Globe, Pencil, Trash } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import type { ProjectCardProps } from "../../types/projects";

export default function ProjectCard({
  project,
  onEdit,
  onDelete,
  disabled = false,
}: ProjectCardProps) {
  const colors = useTheme();

  const handleOpenUrl = (url?: string | null) => {
    if (!url) return;
    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) {
      target = `https://${target}`;
    }
    Linking.openURL(target).catch(() => {});
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {project.title}
          </Text>
          {project.isImportedFromGithub ? (
            <View
              style={[
                styles.githubPill,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Code2
                size={11}
                color={colors.textSecondary}
                strokeWidth={1.75}
              />
              <Text
                style={[styles.githubPillText, { color: colors.textSecondary }]}
              >
                GitHub
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => onEdit(project)}
            disabled={disabled}
            accessibilityLabel={`Edit ${project.title}`}
          >
            <Pencil size={13} color={colors.textSecondary} strokeWidth={1.75} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor: colors.errorSoft,
                borderColor: colors.errorBorder,
                opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => onDelete(project.id)}
            disabled={disabled}
            accessibilityLabel={`Delete ${project.title}`}
          >
            <Trash size={13} color={colors.error} strokeWidth={1.75} />
          </Pressable>
        </View>
      </View>

      {/* Description */}
      <Text
        style={[styles.description, { color: colors.textSecondary }]}
        numberOfLines={3}
      >
        {project.description}
      </Text>

      {/* Tech Stack Chips */}
      {project.techStack && project.techStack.length > 0 ? (
        <View style={styles.techStackWrap}>
          {project.techStack.map((tech, idx) => (
            <View
              key={`${project.id}_${tech}_${idx}`}
              style={[
                styles.techChip,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.techChipText, { color: colors.text }]}>
                {tech}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Links Row */}
      {project.liveDemoUrl || project.repoUrl ? (
        <View
          style={[styles.linksRow, { borderTopColor: colors.border }]}
        >
          {project.liveDemoUrl ? (
            <Pressable
              accessibilityRole="link"
              style={({ pressed }) => [
                styles.linkButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => handleOpenUrl(project.liveDemoUrl)}
            >
              <Globe size={13} color={colors.primary} strokeWidth={1.75} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                Live Demo
              </Text>
              <ExternalLink
                size={11}
                color={colors.primary}
                strokeWidth={1.75}
              />
            </Pressable>
          ) : null}

          {project.repoUrl ? (
            <Pressable
              accessibilityRole="link"
              style={({ pressed }) => [
                styles.linkButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => handleOpenUrl(project.repoUrl)}
            >
              <Code2
                size={13}
                color={colors.textSecondary}
                strokeWidth={1.75}
              />
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                Repository
              </Text>
              <ExternalLink
                size={11}
                color={colors.textSecondary}
                strokeWidth={1.75}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm + 2,
    ...tokens.shadow.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingRight: tokens.spacing.sm,
  },
  title: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.md,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  githubPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  githubPillText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  description: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  techStackWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs + 2,
    marginTop: 2,
  },
  techChip: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  techChipText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  linksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    paddingTop: tokens.spacing.sm + 2,
    borderTopWidth: 1,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  linkText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
});
