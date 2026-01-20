import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { BrandColors, Spacing } from "@/constants/theme";

interface LockedFeatureOverlayProps {
  title: string;
  subtitle: string;
  onUnlock: () => void;
  isVisible?: boolean;
}

/**
 * LockedFeatureOverlay - High-quality blurred overlay with golden lock icon
 * Used for Team and Project tabs when user is not on appropriate plan
 */
export function LockedFeatureOverlay({
  title,
  subtitle,
  onUnlock,
  isVisible = true,
}: LockedFeatureOverlayProps) {
  const { theme } = useTheme();

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
        {/* Close Button */}

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
        <ThemedText
          type="h1"
          style={styles.title}
        >
          {title}
        </ThemedText>

        <ThemedText
          type="body"
          style={[styles.subtitle, { color: theme.tabIconDefault }]}
        >
          {subtitle}
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
          onPress={onUnlock}
        >
          <Feather name="unlock" size={18} color={theme.text} />
          <ThemedText
            style={[
              styles.unlockButtonText,
              { color: theme.backgroundRoot },
            ]}
          >
            Unlock {title}
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
            Upgrade to Team or Enterprise to unlock collaboration features
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
