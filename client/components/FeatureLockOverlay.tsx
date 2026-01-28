import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { BrandColors, Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface FeatureLockOverlayProps {
  isLocked: boolean;
  requiredPlan: "solo" | "professional" | "enterprise";
  currentPlan?: "free" | "solo" | "professional" | "enterprise";
  onUpgradePress: () => void;
  feature: string;
}

export function FeatureLockOverlay({
  isLocked,
  requiredPlan,
  currentPlan,
  onUpgradePress,
  feature,
}: FeatureLockOverlayProps) {
  const { theme } = useTheme();

  if (!isLocked) {
    return null;
  }

  const planName = requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1);

  return (
    <View style={[styles.overlay, { backgroundColor: "rgba(0, 0, 0, 0.5)" }]}>
      <View style={[styles.content, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.iconContainer}>
          <Feather
            name="lock"
            size={48}
            color={BrandColors.constructionGold}
          />
        </View>

        <ThemedText type="h3" style={styles.title}>
          {feature} Locked
        </ThemedText>

        <ThemedText
          type="body"
          style={[styles.description, { color: theme.textSecondary }]}
        >
          Upgrade to the {planName} plan to unlock this feature
        </ThemedText>

        <Pressable
          onPress={onUpgradePress}
          style={[
            styles.upgradeButton,
            { backgroundColor: BrandColors.constructionGold },
          ]}
        >
          <ThemedText type="body" style={{ color: "#000", fontWeight: "600" }}>
            Upgrade to {planName}
          </ThemedText>
        </Pressable>

        <ThemedText
          type="small"
          style={[styles.benefits, { color: theme.textSecondary }]}
        >
          {requiredPlan === "solo" && "Get unlimited invoices and voice transcriptions"}
          {requiredPlan === "professional" && "Protect your money with scope proof and client approval"}
          {requiredPlan === "enterprise" && "Access all features with dedicated support"}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  content: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    maxWidth: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  description: {
    marginBottom: Spacing.lg,
    textAlign: "center",
    lineHeight: 20,
  },
  upgradeButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    width: "100%",
    alignItems: "center",
  },
  benefits: {
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 18,
  },
});
