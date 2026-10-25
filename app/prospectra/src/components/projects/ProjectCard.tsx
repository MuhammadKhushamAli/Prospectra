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
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {project.title}
          </Text>
          {project.isImportedFromGithub ? (
            <View
              style={[
                styles.githubPill,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Code2 size={11} color={colors.primary} />
              <Text style={[styles.githubPillText, { color: colors.primary }]}>
                GitHub
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => onEdit(project)}
            disabled={disabled}
            accessibilityLabel={`Edit ${project.title}`}
          >
            <Pencil size={14} color={colors.text} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              styles.deleteButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => onDelete(project.id)}
            disabled={disabled}
            accessibilityLabel={`Delete ${project.title}`}
          >
            <Trash size={14} color={colors.error} />
          </Pressable>
        </View>
      </View>

      {/* Description */}
      <Text style={[styles.description, { color: colors.placeholder }]} numberOfLines={3}>
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
                { backgroundColor: colors.background, borderColor: colors.border },
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
        <View style={styles.linksRow}>
          {project.liveDemoUrl ? (
            <Pressable
              style={styles.linkButton}
              onPress={() => handleOpenUrl(project.liveDemoUrl)}
            >
              <Globe size={13} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                Live Demo
              </Text>
              <ExternalLink size={11} color={colors.primary} />
            </Pressable>
          ) : null}

          {project.repoUrl ? (
            <Pressable
              style={styles.linkButton}
              onPress={() => handleOpenUrl(project.repoUrl)}
            >
              <Code2 size={13} color={colors.placeholder} />
              <Text style={[styles.linkText, { color: colors.placeholder }]}>
                Repository
              </Text>
              <ExternalLink size={11} color={colors.placeholder} />
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
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
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
    gap: tokens.spacing.xs,
    paddingRight: tokens.spacing.sm,
  },
  title: {
    fontFamily: "DMSansBold",
    fontSize: tokens.fontSize.md,
  },
  githubPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: tokens.spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  githubPillText: {
    fontFamily: "DMSansMedium",
    fontSize: 10,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {},
  description: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  techStackWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.xs,
    marginTop: 2,
  },
  techChip: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  techChipText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
  },
  linksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    paddingTop: tokens.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  linkText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
});
