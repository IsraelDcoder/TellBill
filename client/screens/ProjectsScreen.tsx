import React, { useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useProjectStore, Project } from "@/stores/projectStore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const statusColors = {
  active: "#22C55E",
  completed: "#3B82F6",
  on_hold: "#F59E0B",
};

function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      }}
      style={[
        styles.projectCard,
        {
          backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot,
          borderColor: theme.border,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.projectHeader}>
        <View
          style={[
            styles.projectIcon,
            { backgroundColor: `${BrandColors.constructionGold}15` },
          ]}
        >
          <Feather name="briefcase" size={20} color={BrandColors.constructionGold} />
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
            type="caption"
            style={[styles.statusText, { color: statusColors[project.status] }]}
          >
            {project.status.replace("_", " ").charAt(0).toUpperCase() +
              project.status.replace("_", " ").slice(1)}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="h4" style={styles.projectName} numberOfLines={1}>
        {project.name}
      </ThemedText>
      <ThemedText
        type="small"
        style={[styles.clientName, { color: theme.textSecondary }]}
        numberOfLines={1}
      >
        {project.clientName}
      </ThemedText>
      <View style={styles.projectFooter}>
        <View style={styles.projectMeta}>
          <Feather name="map-pin" size={12} color={theme.textSecondary} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary }}
            numberOfLines={1}
          >
            {project.address}
          </ThemedText>
        </View>
        <ThemedText type="h4" style={{ color: BrandColors.constructionGold }}>
          ${project.budget.toLocaleString()}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

export default function ProjectsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { projects, addProject } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddProject = () => {
    const newProject: Omit<Project, "id" | "createdAt"> = {
      name: `Project ${projects.length + 1}`,
      clientName: "New Client",
      address: "123 Main St",
      status: "active",
      budget: 5000,
    };
    addProject(newProject);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.searchContainer,
          {
            marginTop: headerHeight + Spacing.sm,
            backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundSecondary,
          },
        ]}
      >
        <Feather name="search" size={18} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search projects..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl },
          filteredProjects.length === 0 && styles.emptyContainer,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => navigation.navigate("ProjectDetail", { projectId: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            image={require("../assets/images/empty_projects_illustration.png")}
            title="No Projects Yet"
            description="Create your first project to organize your work and track progress."
            actionLabel="Add Project"
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
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
  },
  row: {
    gap: Spacing.md,
  },
  projectCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontWeight: "600",
    fontSize: 10,
    textTransform: "capitalize",
  },
  projectName: {
    marginBottom: 4,
  },
  clientName: {
    marginBottom: Spacing.md,
  },
  projectFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  projectMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    marginRight: Spacing.sm,
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
