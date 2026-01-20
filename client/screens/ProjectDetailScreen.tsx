import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useProjectStore } from "@/stores/projectStore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "ProjectDetail">;

const statusConfig = {
  active: { color: "#22C55E", label: "Active" },
  completed: { color: "#3B82F6", label: "Completed" },
  on_hold: { color: "#F59E0B", label: "On Hold" },
};

export default function ProjectDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { getProject, updateProject } = useProjectStore();

  const project = getProject(route.params.projectId);

  if (!project) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: headerHeight + Spacing.xl,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText type="h3">Project not found</ThemedText>
        <Button onPress={() => navigation.goBack()} style={{ marginTop: Spacing.lg }}>
          Go Back
        </Button>
      </View>
    );
  }

  const status = statusConfig[project.status];

  if (!status) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: headerHeight + Spacing.xl,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText type="h3">Invalid project status</ThemedText>
        <Button onPress={() => navigation.goBack()} style={{ marginTop: Spacing.lg }}>
          Go Back
        </Button>
      </View>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleStatusChange = (newStatus: "active" | "completed" | "on_hold") => {
    updateProject(project.id, { status: newStatus });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing["3xl"],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${status.color}20` },
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: status.color }]}
              />
              <ThemedText
                type="small"
                style={{ color: status.color, fontWeight: "600" }}
              >
                {status.label}
              </ThemedText>
            </View>
          </View>

          <ThemedText type="h1" style={styles.projectName}>
            {project.name}
          </ThemedText>

          <View style={styles.infoRow}>
            <Feather name="user" size={16} color={theme.textSecondary} />
            <ThemedText type="body">{project.clientName}</ThemedText>
          </View>

          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color={theme.textSecondary} />
            <ThemedText type="body">{project.address}</ThemedText>
          </View>

          <View style={styles.infoRow}>
            <Feather name="calendar" size={16} color={theme.textSecondary} />
            <ThemedText type="body">
              Started {new Date(project.createdAt).toLocaleDateString()}
            </ThemedText>
          </View>
        </GlassCard>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Budget
          </ThemedText>
          <View
            style={[
              styles.budgetCard,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
              },
            ]}
          >
            <View style={styles.budgetHeader}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Total Budget
              </ThemedText>
              <ThemedText
                type="display"
                style={{ color: BrandColors.constructionGold }}
              >
                {formatCurrency(project.budget)}
              </ThemedText>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressLabels}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Progress
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {project.status === "completed" ? "100" : "45"}%
                </ThemedText>
              </View>
              <View
                style={[styles.progressBar, { backgroundColor: theme.border }]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: BrandColors.constructionGold,
                      width: project.status === "completed" ? "100%" : "45%",
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Update Status
          </ThemedText>
          <View style={styles.statusButtons}>
            {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map(
              (key) => (
                <Button
                  key={key}
                  variant={project.status === key ? "primary" : "outline"}
                  size="small"
                  onPress={() => handleStatusChange(key)}
                  style={styles.statusButton}
                >
                  {statusConfig[key].label}
                </Button>
              )
            )}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Quick Actions
          </ThemedText>
          <View style={styles.actionsGrid}>
            <Button
              variant="secondary"
              onPress={() => navigation.navigate("VoiceRecording")}
              style={styles.actionButton}
            >
              <View style={styles.actionContent}>
                <Feather name="mic" size={20} color={theme.text} />
                <ThemedText type="small">Record Job</ThemedText>
              </View>
            </Button>
            <Button
              variant="secondary"
              onPress={() =>
                navigation.navigate("TranscriptReview", { transcript: "" })
              }
              style={styles.actionButton}
            >
              <View style={styles.actionContent}>
                <Feather name="file-plus" size={20} color={theme.text} />
                <ThemedText type="small">New Invoice</ThemedText>
              </View>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainCard: {
    marginBottom: Spacing.xl,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: Spacing.md,
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
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  projectName: {
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  budgetCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  budgetHeader: {
    marginBottom: Spacing.lg,
  },
  progressContainer: {
    gap: Spacing.sm,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  statusButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statusButton: {
    flex: 1,
  },
  actionsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  actionContent: {
    alignItems: "center",
    gap: Spacing.sm,
  },
});
