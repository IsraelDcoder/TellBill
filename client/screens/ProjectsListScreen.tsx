import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { ProjectActionsModal } from "@/components/ProjectActionsModal";
import { UpgradeRequiredModal } from "@/components/UpgradeRequiredModal";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors, Shadows } from "@/constants/theme";
import { PLAN_LIMITS } from "@/constants/planLimits";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useAuth } from "@/context/AuthContext";
import { useProjectStore } from "@/stores/projectStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { getApiUrl, getBackendUrl } from "@/lib/backendUrl";
import { getAuthToken } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Project {
  id: string;
  name: string;
  clientName: string;
  address: string;
  status: "active" | "completed" | "on_hold";
  budget: number;
}

const statusColors = {
  active: "#22C55E",
  completed: "#3B82F6",
  on_hold: "#F59E0B",
};

function ProjectCard({
  project,
  onPress,
  onLongPress,
}: {
  project: Project;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ flex: 1 }}>
      <View
        style={[
          styles.projectCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.projectHeader}>
          <View
            style={[
              styles.projectIcon,
              { backgroundColor: `${BrandColors.constructionGold}15` },
            ]}
          >
            <Feather
              name="briefcase"
              size={20}
              color={BrandColors.constructionGold}
            />
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColors[project.status]}20` },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColors[project.status] },
              ]}
            />
            <ThemedText
              type="small"
              style={[
                styles.statusText,
                { color: statusColors[project.status] },
              ]}
            >
              {project.status.replace("_", " ").charAt(0).toUpperCase() +
                project.status.replace("_", " ").slice(1)}
            </ThemedText>
          </View>
        </View>

        <ThemedText type="h4" style={styles.projectName}>
          {project.name}
        </ThemedText>
        <ThemedText type="small" style={styles.projectClient}>
          {project.clientName} • {project.address}
        </ThemedText>

        <View style={styles.projectFooter}>
          <ThemedText type="small" style={styles.budgetLabel}>
            Budget
          </ThemedText>
          <ThemedText
            type="h4"
            style={{ color: BrandColors.constructionGold }}
          >
            ${project.budget.toLocaleString()}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export default function ProjectsListScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const userId = user?.id;
  const { projects: storeProjects, addProject: addProjectToStore } = useProjectStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [selectedProjectForActions, setSelectedProjectForActions] = useState<Project | null>(null);
  const { currentPlan, projectsAccessed, incrementProjectAccess, showLimitModal, limitModalType, setShowLimitModal } = useSubscriptionStore();

  // Load projects from API when screen mounts
  useEffect(() => {
    if (userId) {
      // Check project access limit for free users
      const projectAccessLimit = PLAN_LIMITS[currentPlan]?.projectAccess;
      if (currentPlan === "free" && projectsAccessed >= projectAccessLimit) {
        setShowLimitModal(true, "project");
        return;
      }
      
      // Increment access counter
      incrementProjectAccess();
      loadProjects();
    }
  }, [userId]);

  const loadProjects = async () => {
    try {
      if (!userId) {
        console.log("[ProjectsList] Skipping load - no userId yet");
        return;
      }

      const baseUrl = getBackendUrl();
      const url = `${baseUrl}/api/projects/${userId}`;
      console.log(`[ProjectsList] Loading projects from: ${url}`);
      
      // ✅ Get auth token and include in Authorization header
      const token = await getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("[ProjectsList] API response:", data);

      if (data.success && data.data) {
        const formattedProjects: Project[] = data.data.map((proj: any) => ({
          id: proj.id,
          name: proj.name,
          clientName: proj.description?.split(", Address:")[0]?.split("Client: ")[1] || "Unknown Client",
          address: proj.description?.split(", Address: ")[1] || "",
          status: proj.status || "active",
          budget: 0, // Budget not stored in DB, would need to add
        }));
        console.log(`[ProjectsList] Loaded ${formattedProjects.length} projects`);
        setProjects(formattedProjects);
      } else {
        console.log("[ProjectsList] API returned success=false or no data");
        // Fallback to store data
        const storeFormatted: Project[] = storeProjects.map((proj) => ({
          ...proj,
        }));
        setProjects(storeFormatted);
      }
    } catch (error) {
      console.error("[ProjectsList] Failed to load projects from API:", error);
      // Fallback to local store data
      console.log("[ProjectsList] Falling back to local store data");
      const storeFormatted: Project[] = storeProjects.map((proj) => ({
        ...proj,
      }));
      setProjects(storeFormatted);
    }
  };

  const handleProjectPress = (project: Project) => {
    navigation.navigate("ProjectHub", {
      projectId: project.id,
      projectName: project.name,
    });
  };

  const handleProjectLongPress = (project: Project) => {
    setSelectedProjectForActions(project);
  };

  const handleStatusChange = async (newStatus: "active" | "completed" | "on_hold") => {
    if (!selectedProjectForActions || !userId) return;

    try {
      const baseUrl = getBackendUrl();
      const url = `${baseUrl}/api/projects/${selectedProjectForActions.id}`;

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData?.error || "Failed to update project"}`);
      }

      const data = await response.json();
      if (data.success) {
        setProjects((prev) =>
          prev.map((proj) =>
            proj.id === selectedProjectForActions.id
              ? { ...proj, status: newStatus }
              : proj
          )
        );
        Alert.alert("Success", `Project status updated to ${newStatus.replace("_", " ")}`);
      }
    } catch (error) {
      console.error("[ProjectsList] Status update error:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to update project status");
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProjectForActions || !userId) return;

    try {
      const baseUrl = getBackendUrl();
      const url = `${baseUrl}/api/projects/${selectedProjectForActions.id}?userId=${userId}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData?.error || "Failed to delete project"}`);
      }

      const data = await response.json();
      if (data.success) {
        // Remove from list
        setProjects((prev) =>
          prev.filter((proj) => proj.id !== selectedProjectForActions.id)
        );
        // Also remove from store
        const { deleteProject } = useProjectStore.getState();
        deleteProject(selectedProjectForActions.id);
        Alert.alert("Success", `Project "${selectedProjectForActions.name}" has been deleted`);
        setSelectedProjectForActions(null);
      }
    } catch (error) {
      console.error("[ProjectsList] Delete error:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to delete project");
    }
  };

  const handleShareProject = async () => {
    if (!selectedProjectForActions) return;

    try {
      // Generate share link - you can customize this URL
      const shareLink = `https://yourdomain.com/projects/${selectedProjectForActions.id}/share`;
      const message = `Check out my project: ${selectedProjectForActions.name}\n\n${shareLink}`;

      await Share.share({
        message,
        title: `Share Project: ${selectedProjectForActions.name}`,
        url: shareLink,
      });
    } catch (error) {
      console.error("[ProjectsList] Share error:", error);
      Alert.alert("Error", "Failed to share project");
    }
  };


  const handleAddProject = () => {
    setShowCreateModal(true);
  };

  const handleCreateProject = async (projectData: {
    name: string;
    clientName: string;
    address: string;
    status: "active" | "completed" | "on_hold";
    budget: number;
  }) => {
    if (!userId) {
      Alert.alert("Error", "User ID not found. Please log in again.");
      return;
    }

    try {
      setIsCreatingProject(true);
      const baseUrl = getBackendUrl();
      const url = `${baseUrl}/api/projects`;
      console.log(`[ProjectsList] Creating project at: ${url}`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          name: projectData.name,
          clientName: projectData.clientName,
          address: projectData.address,
          status: projectData.status,
          budget: projectData.budget,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to create project on server`);
      }

      const data = await response.json();
      console.log("[ProjectsList] Create response:", data);

      if (data.success) {
        const newProject: Project = {
          id: data.project.id,
          name: data.project.name,
          clientName: projectData.clientName,
          address: projectData.address,
          status: data.project.status,
          budget: projectData.budget,
        };
        
        // Also add to local store as fallback
        addProjectToStore({
          name: projectData.name,
          clientName: projectData.clientName,
          address: projectData.address,
          status: projectData.status,
          budget: projectData.budget,
        });
        
        // Increment project creation count for usage tracking
        const { incrementProjectCreation } = useSubscriptionStore.getState();
        incrementProjectCreation();
        
        setProjects((prev) => [newProject, ...prev]);
        setShowCreateModal(false);
        Alert.alert(
          "✅ Project Created",
          `${newProject.name} has been added. Tap it to start logging activities.`
        );
      } else {
        throw new Error(data.error || "Failed to create project");
      }
    } catch (error) {
      console.error("[ProjectsList] Project creation error:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to create project. Please try again.");
    } finally {
      setIsCreatingProject(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.searchContainer,
          {
            marginTop: headerHeight + Spacing.sm,
            backgroundColor: isDark
              ? theme.backgroundDefault
              : theme.backgroundSecondary,
          },
        ]}
      >
        <Feather name="search" size={18} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search projects..."
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        numColumns={1}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => handleProjectPress(item)}
            onLongPress={() => handleProjectLongPress(item)}
          />
        )}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: tabBarHeight + Spacing.lg,
            paddingHorizontal: Spacing.lg,
          },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="project"
            title="No Projects Yet"
            description="Create a new project to get started"
            actionLabel="New Project"
            onAction={handleAddProject}
          />
        }
      />

      <Pressable
        style={[
          styles.fab,
          { backgroundColor: BrandColors.constructionGold, bottom: tabBarHeight + Spacing.lg },
          Shadows.fab,
        ]}
        onPress={handleAddProject}
      >
        <Feather name="plus" size={24} color={BrandColors.slateGrey} />
      </Pressable>

      <CreateProjectModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateProject}
        isLoading={isCreatingProject}
      />

      <ProjectActionsModal
        isVisible={!!selectedProjectForActions}
        projectId={selectedProjectForActions?.id || ""}
        projectName={selectedProjectForActions?.name || ""}
        currentStatus={selectedProjectForActions?.status || "active"}
        onClose={() => setSelectedProjectForActions(null)}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteProject}
        onShare={handleShareProject}
      />
      <UpgradeRequiredModal
        visible={showLimitModal && limitModalType === "project"}
        onClose={() => setShowLimitModal(false)}
        type="project"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
  },
  list: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  projectCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  projectHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontWeight: "500",
  },
  projectName: {
    marginBottom: Spacing.xs,
  },
  projectClient: {
    opacity: 0.6,
    marginBottom: Spacing.md,
  },
  projectFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.1)",
  },
  budgetLabel: {
    opacity: 0.6,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});

