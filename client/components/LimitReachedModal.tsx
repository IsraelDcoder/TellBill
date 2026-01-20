import React, { useEffect, useState } from "react";
import { View, StyleSheet, Modal, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BrandColors, Spacing } from "@/constants/theme";

interface LimitReachedModalProps {
  isVisible: boolean;
  onDismiss: () => void;
  onUpgrade: () => void;
  minutesSaved?: number;
}

/**
 * LimitReachedModal - Full-screen modal shown when free user hits 3-use limit
 * Shows motivational message about time saved and prompts upgrade
 */
export function LimitReachedModal({
  isVisible,
  onDismiss,
  onUpgrade,
  minutesSaved = 0,
}: LimitReachedModalProps) {
  const { theme, isDark } = useTheme();
  const [displayMinutes, setDisplayMinutes] = useState(0);

  // Animate minute counter
  useEffect(() => {
    if (!isVisible) return;

    let current = 0;
    const interval = setInterval(() => {
      current += Math.ceil(minutesSaved / 10);
      if (current >= minutesSaved) {
        setDisplayMinutes(minutesSaved);
        clearInterval(interval);
      } else {
        setDisplayMinutes(current);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isVisible, minutesSaved]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)" },
        ]}
      >
        <View
          style={[
            styles.content,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          {/* Close Button */}
          <Pressable
            style={styles.closeButton}
            onPress={onDismiss}
          >
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>

          {/* Celebration Icon */}
          <View
            style={[
              styles.celebrationIcon,
              { backgroundColor: BrandColors.constructionGold + "20" },
            ]}
          >
            <Feather
              name="star"
              size={48}
              color={BrandColors.constructionGold}
              fill={BrandColors.constructionGold}
            />
          </View>

          {/* Main Message */}
          <ThemedText
            type="h1"
            style={styles.mainTitle}
          >
            You've reached your free limit!
          </ThemedText>

          {/* Time Saved Callout */}
          <View
            style={[
              styles.savedCallout,
              { borderColor: BrandColors.constructionGold },
            ]}
          >
            <ThemedText
              type="small"
              style={[
                styles.savedLabel,
                { color: theme.tabIconDefault },
              ]}
            >
              You've saved
            </ThemedText>
            <ThemedText
              type="h1"
              style={[
                styles.savedMinutes,
                { color: BrandColors.constructionGold },
              ]}
            >
              {displayMinutes}
            </ThemedText>
            <ThemedText
              type="small"
              style={[
                styles.savedLabel,
                { color: theme.tabIconDefault },
              ]}
            >
              minutes today with AI
            </ThemedText>
          </View>

          {/* Description */}
          <ThemedText
            type="body"
            style={[
              styles.description,
              { color: theme.tabIconDefault },
            ]}
          >
            Keep the momentum going! Upgrade to Solo to get unlimited voice recordings and invoices.
          </ThemedText>

          {/* Benefits List */}
          <View style={styles.benefitsList}>
            <BenefitItem
              icon="zap"
              text="Unlimited voice recordings"
              isDark={isDark}
            />
            <BenefitItem
              icon="file-text"
              text="Unlimited invoices"
              isDark={isDark}
            />
            <BenefitItem
              icon="clock"
              text="Save even more time"
              isDark={isDark}
            />
          </View>

          {/* Pricing */}
          <View
            style={[
              styles.pricingBox,
              { backgroundColor: BrandColors.constructionGold + "10" },
            ]}
          >
            <ThemedText type="small" style={styles.pricingLabel}>
              START FREE MONTH
            </ThemedText>
            <ThemedText
              type="h1"
              style={[
                styles.pricingAmount,
                { color: BrandColors.constructionGold },
              ]}
            >
              $29
            </ThemedText>
            <ThemedText type="small" style={styles.pricingFrequency}>
              per month, cancel anytime
            </ThemedText>
          </View>

          {/* Action Buttons */}
          <Pressable
            style={({ pressed }) => [
              styles.upgradeButton,
              {
                backgroundColor: BrandColors.constructionGold,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={onUpgrade}
          >
            <ThemedText
              style={[
                styles.upgradeButtonText,
                { color: theme.backgroundRoot },
              ]}
            >
              Upgrade Now
            </ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                opacity: pressed ? 0.7 : 1,
                borderColor: theme.border,
              },
            ]}
            onPress={onDismiss}
          >
            <ThemedText style={styles.secondaryButtonText}>
              Maybe Later
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

interface BenefitItemProps {
  icon: string;
  text: string;
  isDark: boolean;
}

function BenefitItem({ icon, text, isDark }: BenefitItemProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.benefitItem}>
      <Feather
        name={icon as any}
        size={20}
        color={BrandColors.constructionGold}
      />
      <ThemedText
        style={[
          styles.benefitText,
          { color: theme.text, marginLeft: Spacing.md },
        ]}
      >
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  content: {
    borderRadius: 16,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["2xl"],
    paddingBottom: Spacing.xl,
    width: "100%",
    maxWidth: 380,
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: Spacing.md,
    marginRight: -Spacing.md,
    marginTop: -Spacing.md,
  },
  celebrationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: Spacing.xl,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  savedCallout: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
    alignItems: "center",
  },
  savedLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  savedMinutes: {
    fontSize: 36,
    fontWeight: "700",
    marginVertical: Spacing.xs,
  },
  description: {
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  benefitsList: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  benefitText: {
    fontSize: 14,
    fontWeight: "500",
  },
  pricingBox: {
    borderRadius: 12,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  pricingLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  pricingAmount: {
    fontSize: 40,
    fontWeight: "700",
  },
  pricingFrequency: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  upgradeButton: {
    paddingVertical: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
