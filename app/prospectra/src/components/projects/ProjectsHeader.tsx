import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Code2, RefreshCw } from "lucide-react-native";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import type { ProjectsHeaderProps } from "../../types/projects";

export default function ProjectsHeader({
  count,
  githubUsername,
  onRefreshFromGithub,
  isRefreshing = false,
}: ProjectsHeaderProps) {
  const colors = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>
          Showcase Your Projects
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: colors.placeholder }]}>
        Add or edit your featured portfolio projects. Prospectra matches these to client requirements during outreach.
      </Text>

      {githubUsername ? (
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.githubBadge,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Code2 size={14} color={colors.primary} />
            <Text style={[styles.githubBadgeText, { color: colors.text }]}>
              GitHub: @{githubUsername}
            </Text>
            {onRefreshFromGithub ? (
              <Pressable
                onPress={onRefreshFromGithub}
                disabled={isRefreshing}
                style={styles.refreshButton}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <RefreshCw size={12} color={colors.placeholder} />
                )}
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.countText, { color: colors.placeholder }]}>
            {count} {count === 1 ? "project" : "projects"} listed
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: "FrauncesBold",
    fontSize: tokens.fontSize.xl,
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: tokens.spacing.xs,
  },
  githubBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  githubBadgeText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
  },
  refreshButton: {
    padding: 2,
    marginLeft: 4,
  },
  countText: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.xs,
  },
});
