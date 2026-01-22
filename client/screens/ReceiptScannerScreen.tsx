import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { ReceiptCamera } from "@/components/ReceiptCamera";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useProjectStore } from "@/stores/projectStore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ReceiptScannerScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { projects: allProjects } = useProjectStore();
  const [showCamera, setShowCamera] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeProjects, setActiveProjects] = useState<any[]>([]);

  // Load active projects from store
  useEffect(() => {
    loadProjects();
  }, [allProjects]);

  useFocusEffect(
    React.useCallback(() => {
      loadProjects();
    }, [allProjects])
  );

  const loadProjects = () => {
    try {
      // Filter only active projects from the project store
      const active = allProjects.filter((proj) => proj.status === "active");
      setActiveProjects(active);
    } catch (error) {
      console.error("[ReceiptScanner] Failed to load projects:", error);
    }
  };

  const handleReceiptAdded = () => {
    // Show success and refresh
    Alert.alert("Success!", "Receipt added to project.", [
      {
        text: "OK",
        onPress: () => {
          setShowCamera(false);
          setSelectedProjectId(null);
          loadProjects();
        },
      },
    ]);
  };

  const handleStartScanning = (projectId: string) => {
    setSelectedProjectId(projectId);
    setShowCamera(true);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {!showCamera ? (
        <ScrollView
          contentContainerStyle={{
            paddingTop: headerHeight,
            paddingBottom: Spacing.xl,
          }}
          scrollIndicatorInsets={{ bottom: insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { paddingHorizontal: Spacing.lg }]}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View
                style={[
                  styles.heroIcon,
                  {
                    backgroundColor: `${BrandColors.constructionGold}20`,
                  },
                ]}
              >
                <Feather name="camera" size={48} color={BrandColors.constructionGold} />
              </View>
              <ThemedText type="h2" style={styles.heroTitle}>
                Scan Receipts
              </ThemedText>
              <ThemedText
                type="body"
                style={[styles.heroSubtitle, { color: theme.textSecondary }]}
              >
                Capture material receipts and automatically extract details for your projects
              </ThemedText>
            </View>

            {/* Quick Start */}
            <GlassCard
              style={[
                styles.card,
                {
                  backgroundColor: isDark
                    ? theme.backgroundDefault
                    : theme.backgroundSecondary,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Feather name="zap" size={20} color={BrandColors.constructionGold} />
                <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
                  How It Works
                </ThemedText>
              </View>
              <View style={styles.steps}>
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <ThemedText type="small" style={{ color: "white", fontWeight: "600" }}>
                      1
                    </ThemedText>
                  </View>
                  <View style={styles.stepContent}>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      Select a Project
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Choose which project to add the receipt to
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <ThemedText type="small" style={{ color: "white", fontWeight: "600" }}>
                      2
                    </ThemedText>
                  </View>
                  <View style={styles.stepContent}>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      Scan Receipt
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Take a clear photo of the receipt
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <ThemedText type="small" style={{ color: "white", fontWeight: "600" }}>
                      3
                    </ThemedText>
                  </View>
                  <View style={styles.stepContent}>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      Auto-Extract
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      AI extracts vendor, items, and total
                    </ThemedText>
                  </View>
                </View>
              </View>
            </GlassCard>

            {/* Projects Section */}
            <View>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Your Active Projects
              </ThemedText>

              {activeProjects.length === 0 ? (
                <GlassCard
                  style={[
                    styles.emptyCard,
                    {
                      backgroundColor: isDark
                        ? theme.backgroundDefault
                        : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <Feather name="inbox" size={40} color={theme.textSecondary} />
                  <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                    No active projects yet
                  </ThemedText>
                  <Button
                    size="small"
                    style={{ marginTop: Spacing.lg }}
                    onPress={() => navigation.navigate("Main", { screen: "ProjectsTab" } as any)}
                  >
                    Create Project
                  </Button>
                </GlassCard>
              ) : (
                <View style={styles.projectsList}>
                  {activeProjects.map((project) => (
                    <Pressable
                      key={project.id}
                      onPress={() => handleStartScanning(project.id)}
                      style={({ pressed }) => [
                        styles.projectCard,
                        {
                          backgroundColor: isDark
                            ? theme.backgroundDefault
                            : theme.backgroundSecondary,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <View style={styles.projectInfo}>
                        <View style={styles.projectHeader}>
                          <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>
                            {project.name}
                          </ThemedText>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: `${BrandColors.constructionGold}20`,
                              },
                            ]}
                          >
                            <ThemedText
                              type="small"
                              style={{
                                color: BrandColors.constructionGold,
                                fontWeight: "600",
                              }}
                            >
                              {project.status}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText
                          type="small"
                          style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
                        >
                          Tap to scan receipt
                        </ThemedText>
                      </View>
                      <Feather name="chevron-right" size={24} color={BrandColors.constructionGold} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Features */}
            <GlassCard
              style={[
                styles.card,
                {
                  backgroundColor: isDark
                    ? theme.backgroundDefault
                    : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText type="h4" style={styles.sectionTitle}>
                AI-Powered Extraction
              </ThemedText>
              <View style={styles.features}>
                <View style={styles.feature}>
                  <Feather name="check-circle" size={20} color={BrandColors.constructionGold} />
                  <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                    Vendor & date detection
                  </ThemedText>
                </View>
                <View style={styles.feature}>
                  <Feather name="check-circle" size={20} color={BrandColors.constructionGold} />
                  <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                    Item & price extraction
                  </ThemedText>
                </View>
                <View style={styles.feature}>
                  <Feather name="check-circle" size={20} color={BrandColors.constructionGold} />
                  <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                    Total calculation
                  </ThemedText>
                </View>
                <View style={styles.feature}>
                  <Feather name="check-circle" size={20} color={BrandColors.constructionGold} />
                  <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                    Duplicate detection
                  </ThemedText>
                </View>
              </View>
            </GlassCard>
          </View>
        </ScrollView>
      ) : selectedProjectId ? (
        <ReceiptCamera
          isVisible={showCamera}
          projectId={selectedProjectId}
          onReceiptAdded={handleReceiptAdded}
          onClose={() => {
            setShowCamera(false);
            setSelectedProjectId(null);
          }}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingVertical: Spacing.lg,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  heroIcon: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  heroSubtitle: {
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  steps: {
    gap: Spacing.lg,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: BrandColors.constructionGold,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  stepContent: {
    flex: 1,
  },
  features: {
    gap: Spacing.md,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
  },
  projectsList: {
    gap: Spacing.lg,
  },
  projectCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  projectInfo: {
    flex: 1,
  },
  projectHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
});
