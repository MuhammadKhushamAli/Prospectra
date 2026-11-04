import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import { tokens } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { getSupabaseClient } from "../../config/supabaseClient";
import { getProfileFromSupabase } from "../../services/profileService";
import {
  extractGithubUsername,
  fetchUserGithubRepos,
} from "../../services/githubRepoService";
import {
  fetchUserProjects,
  saveUserProjects,
} from "../../services/projectService";
import NotificationBanner from "../ui/NotificationBanner";
import ProjectsHeader from "./ProjectsHeader";
import ProjectCard from "./ProjectCard";
import ProjectModal from "./ProjectModal";
import ProjectsEmptyState from "./ProjectsEmptyState";
import ProjectsFooterActions from "./ProjectsFooterActions";
import type { NotificationVariant } from "../../types/ui";
import type { ProjectFormValues, UserProject } from "../../types/projects";
import { notificationVariant } from "../../constants/constants";

export default function ProjectsScreen() {
  const colors = useTheme();

  const [userId, setUserId] = useState<string>("");
  const [orgId, setOrgId] = useState<string>("");
  const [githubUsername, setGithubUsername] = useState<string | null>(null);

  const [projects, setProjects] = useState<UserProject[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRefreshingGithub, setIsRefreshingGithub] = useState<boolean>(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<UserProject | null>(
    null,
  );

  // Notification State
  const [notification, setNotification] = useState<{
    variant: NotificationVariant;
    message: string;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function initializeScreen() {
        try {
          const supabase = getSupabaseClient();
          const { data: sessionData, error: sessionErr } =
            await supabase.auth.getSession();

          if (sessionErr || !sessionData.session?.user) {
            if (isMounted) router.replace("/auth");
            return;
          }

          const currentUserId = sessionData.session.user.id;
          if (isMounted) setUserId(currentUserId);

          // 1. Fetch user profile to get orgId & githubUrl
          const profile = await getProfileFromSupabase();
          if (!isMounted) return;

          const currentOrgId = profile?.orgId || "";
          setOrgId(currentOrgId);

          const ghUsername = extractGithubUsername(profile?.githubUrl);
          setGithubUsername(ghUsername);

          // 2. Fetch existing projects from database
          let existingProjects: UserProject[] = [];
          if (currentOrgId) {
            existingProjects = await fetchUserProjects(
              currentUserId,
              currentOrgId,
            );
          }

          if (isMounted) {
            if (existingProjects.length > 0) {
              setProjects(existingProjects);
            } else if (ghUsername) {
              // 3. If no projects in DB, automatically fetch public GitHub repos
              setIsRefreshingGithub(true);
              const ghProjects = await fetchUserGithubRepos(ghUsername);
              if (isMounted) {
                setProjects(ghProjects);
                if (ghProjects.length > 0) {
                  setNotification({
                    variant: notificationVariant.success,
                    message: `Imported ${ghProjects.length} repositories from GitHub (@${ghUsername}).`,
                  });
                }
              }
            }
          }
        } catch (error: any) {
          if (isMounted) {
            setNotification({
              variant: notificationVariant.error,
              message: error?.message || "Failed to load projects.",
            });
          }
        } finally {
          if (isMounted) {
            setIsInitializing(false);
            setIsRefreshingGithub(false);
          }
        }
      }

      initializeScreen();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  // Manual re-sync from GitHub
  const handleRefreshFromGithub = async () => {
    if (!githubUsername) return;
    setIsRefreshingGithub(true);
    setNotification(null);
    try {
      const fetched = await fetchUserGithubRepos(githubUsername);
      if (fetched.length > 0) {
        // Merge with non-github projects or replace
        setProjects(fetched);
        setNotification({
          variant: notificationVariant.success,
          message: `Refreshed ${fetched.length} repositories from GitHub.`,
        });
      } else {
        setNotification({
          variant: notificationVariant.error,
          message: `No public repositories found for @${githubUsername}.`,
        });
      }
    } catch (err: any) {
      setNotification({
        variant: notificationVariant.error,
        message: err?.message || "Failed to refresh GitHub repositories.",
      });
    } finally {
      setIsRefreshingGithub(false);
    }
  };

  // Open modal for new project
  const handleOpenAddModal = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  // Open modal for editing existing project
  const handleOpenEditModal = (project: UserProject) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  // Delete project from list
  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  // Save or update project in state
  const handleSaveModalProject = (
    values: ProjectFormValues,
    projectId?: string,
  ) => {
    if (projectId) {
      // Edit
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                title: values.title,
                description: values.description,
                techStack: values.techStack,
                liveDemoUrl: values.liveDemoUrl || null,
                repoUrl: values.repoUrl || p.repoUrl || null,
              }
            : p,
        ),
      );
    } else {
      // Add
      const newProject: UserProject = {
        id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: values.title,
        description: values.description,
        techStack: values.techStack,
        liveDemoUrl: values.liveDemoUrl || null,
        repoUrl: values.repoUrl || null,
        isImportedFromGithub: false,
      };
      setProjects((prev) => [newProject, ...prev]);
    }
  };

  // Submit and save projects to Supabase database
  const handleSubmitProjects = async () => {
    if (!userId || !orgId) {
      router.replace("/target-industries" as any);
      return;
    }

    setIsSaving(true);
    setNotification(null);
    try {
      await saveUserProjects(userId, orgId, projects);
      setNotification({
        variant: notificationVariant.success,
        message: "Projects saved successfully.",
      });
      // Advance to Target Industries page
      router.replace("/target-industries" as any);
    } catch (err: any) {
      setNotification({
        variant: notificationVariant.error,
        message: err?.message || "Failed to save projects to database.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    router.replace("/target-industries" as any);
  };

  if (isInitializing) {
    return (
      <View
        style={[styles.loadingScreen, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {notification ? (
        <NotificationBanner
          variant={notification.variant}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <ProjectsHeader
            count={projects.length}
            githubUsername={githubUsername}
            onRefreshFromGithub={handleRefreshFromGithub}
            isRefreshing={isRefreshingGithub}
          />

          {/* Projects List or Empty State */}
          {projects.length === 0 ? (
            <ProjectsEmptyState
              onAddProject={handleOpenAddModal}
              hasGithub={Boolean(githubUsername)}
            />
          ) : (
            <View style={styles.list}>
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteProject}
                  disabled={isSaving}
                />
              ))}
            </View>
          )}

          {/* Footer Actions */}
          <ProjectsFooterActions
            onAddProject={handleOpenAddModal}
            onSubmit={handleSubmitProjects}
            onSkip={handleSkip}
            isLoading={isSaving}
            canSubmit={true}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add / Edit Project Modal */}
      <ProjectModal
        visible={isModalOpen}
        project={selectedProject}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModalProject}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xl,
    paddingBottom: tokens.spacing.xl,
  },
  list: {
    gap: tokens.spacing.sm + 4,
  },
});
