import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BrandColors, Spacing } from "@/constants/theme";

interface LockedFeatureOverlayProps {
  feature?: "scope_proof" | "projects" | "receipt_scanning" | "material_cost_capture" | "money_alerts";
  title?: string;
  subtitle?: string;
  onUnlock?: () => void;
  isVisible?: boolean;
}

// Feature configuration
const FEATURE_CONFIG: Record<string, { title: string; subtitle: string; minPlan: string }> = {
  scope_proof: {
    title: "Approvals",
    subtitle: "Manage client approvals for extra work",
    minPlan: "Professional",
  },
  projects: {
    title: "Projects",
    subtitle: "Organize and track your projects",
    minPlan: "Solo",
  },
  receipt_scanning: {
    title: "Receipt Scanning",
    subtitle: "Scan and process receipts automatically",
    minPlan: "Solo",
  },
  material_cost_capture: {
    title: "Material Costs",
    subtitle: "Track and bill material costs to clients",
    minPlan: "Solo",
  },
  money_alerts: {
    title: "Money Alerts",
    subtitle: "Track unbilled work and missed revenue",
    minPlan: "Solo",
  },
};

/**
 * LockedFeatureOverlay - High-quality blurred overlay with golden lock icon
 * Used for premium features when user is not on appropriate plan
 */
export function LockedFeatureOverlay({
  feature,
  title,
  subtitle,
  onUnlock,
  isVisible = true,
}: LockedFeatureOverlayProps) {
  const { theme } = useTheme();
  const navigation = useNavigation();

  // Get feature config or use provided props
  const featureTitle = title || (feature ? FEATURE_CONFIG[feature]?.title : "Feature");
  const featureSubtitle = subtitle || (feature ? FEATURE_CONFIG[feature]?.subtitle : "Unlock this feature");
  const minPlan = feature ? FEATURE_CONFIG[feature]?.minPlan : "Solo";

  const handleUnlock = () => {
    if (onUnlock) {
      onUnlock();
    } else {
      // Default: navigate to billing
      navigation.navigate("Billing" as never);
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      {/* Blurred background */}
      <BlurView intensity={90} style={StyleSheet.absoluteFill} />

      {/* Overlay content */}
      <View
        style={[
          styles.content,
          { backgroundColor: theme.backgroundDefault + "E6" }, // Semi-transparent
        ]}
      >
        {/* Golden Lock Icon */}
        <View
          style={[
            styles.lockIconContainer,
            { borderColor: BrandColors.constructionGold },
          ]}
        >
          <Feather
            name="lock"
            size={48}
            color={BrandColors.constructionGold}
          />
        </View>

        {/* Text Content */}
        <ThemedText type="h1" style={styles.title}>
          {featureTitle}
        </ThemedText>

        <ThemedText
          type="body"
          style={[styles.subtitle, { color: theme.tabIconDefault }]}
        >
          {featureSubtitle}
        </ThemedText>

        {/* Unlock Button */}
        <Pressable
          style={({ pressed }) => [
            styles.unlockButton,
            {
              backgroundColor: BrandColors.constructionGold,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={handleUnlock}
        >
          <Feather name="unlock" size={18} color={theme.text} />
          <ThemedText
            style={[
              styles.unlockButtonText,
              { color: theme.backgroundRoot },
            ]}
          >
            Upgrade Now
          </ThemedText>
        </Pressable>

        {/* Feature Info */}
        <View style={[styles.infoBox, { borderColor: theme.border }]}>
          <Feather
            name="info"
            size={16}
            color={BrandColors.constructionGold}
          />
          <ThemedText
            type="small"
            style={[
              styles.infoText,
              { color: theme.tabIconDefault, marginLeft: Spacing.md },
            ]}
          >
            Upgrade to {minPlan} plan or higher to unlock {featureTitle}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["2xl"],
    borderRadius: 16,
    width: "85%",
    maxWidth: 320,
  },
  lockIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  unlockButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    width: "100%",
  },
  infoText: {
    flex: 1,
  },
});
