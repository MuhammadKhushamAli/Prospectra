import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
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

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Add or edit your featured portfolio projects. Prospectra matches these
        to client requirements during outreach.
      </Text>

      {githubUsername ? (
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.githubBadge,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Code2 size={14} color={colors.textSecondary} strokeWidth={1.75} />
            <Text style={[styles.githubBadgeText, { color: colors.text }]}>
              GitHub: @{githubUsername}
            </Text>
            {onRefreshFromGithub ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh from GitHub"
                onPress={onRefreshFromGithub}
                disabled={isRefreshing}
                style={({ pressed }) => [
                  styles.refreshButton,
                  { opacity: pressed ? 0.65 : 1 },
                ]}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <RefreshCw
                    size={12}
                    color={colors.textSecondary}
                    strokeWidth={1.75}
                  />
                )}
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.countText, { color: colors.textSecondary }]}>
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
    marginBottom: tokens.spacing.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: "DMSansSemiBold",
    fontSize: tokens.fontSize.xl,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "DMSans",
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: tokens.spacing.sm,
  },
  githubBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs + 2,
    paddingHorizontal: tokens.spacing.sm + 2,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  githubBadgeText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
  refreshButton: {
    padding: 2,
    marginLeft: 2,
  },
  countText: {
    fontFamily: "DMSansMedium",
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
  },
});
