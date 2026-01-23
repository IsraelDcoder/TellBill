import React from "react";
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UpgradeRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  type: "voice" | "invoice" | "project" | "feature";
  featureName?: string;
}

export function UpgradeRequiredModal({
  visible,
  onClose,
  type,
  featureName,
}: UpgradeRequiredModalProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { voiceRecordingsUsed, invoicesCreated, projectsCreated, currentPlan } = useSubscriptionStore();

  const getContent = () => {
    if (type === "voice") {
      return {
        icon: "mic",
        title: "Voice Recording Limit Reached",
        description: `You've used all 3 free voice recordings this month. Upgrade to ${
          currentPlan === "free" ? "Solo" : "a higher plan"
        } to record unlimited job details.`,
      };
    } else if (type === "invoice") {
      return {
        icon: "file-text",
        title: "Invoice Limit Reached",
        description: `You've created 3 free invoices this month. Upgrade to ${
          currentPlan === "free" ? "Solo" : "a higher plan"
        } to generate unlimited invoices.`,
      };
    } else if (type === "project") {
      return {
        icon: "briefcase",
        title: "Project Limit Reached",
        description: `You've created 3 free projects. Upgrade to ${
          currentPlan === "free" ? "Solo" : "a higher plan"
        } to manage unlimited projects.`,
      };
    } else {
      return {
        icon: "lock",
        title: `${featureName} is Premium`,
        description: `This feature is only available on paid plans. Upgrade to Solo, Team, or Enterprise to unlock it.`,
      };
    }
  };

  const content = getContent();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: "rgba(0, 0, 0, 0.5)" },
        ]}
      >
        <View
          style={[
            styles.container,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
          >
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>

          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: `${BrandColors.constructionGold}20` },
              ]}
            >
              <Feather
                name={content.icon as any}
                size={40}
                color={BrandColors.constructionGold}
              />
            </View>
          </View>

          <ThemedText type="h2" style={styles.title}>
            {content.title}
          </ThemedText>

          <ThemedText
            type="body"
            style={[styles.description, { color: theme.textSecondary }]}
          >
            {content.description}
          </ThemedText>

          <View style={styles.plansPreview}>
            <ThemedText
              type="small"
              style={[styles.plansLabel, { color: theme.textSecondary }]}
            >
              Available Plans
            </ThemedText>
            <View style={styles.plansList}>
              <View
                style={[
                  styles.planItem,
                  { borderColor: theme.border, backgroundColor: `${BrandColors.constructionGold}05` },
                ]}
              >
                <ThemedText type="h4" style={{ fontWeight: "700" }}>
                  Solo
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  $29/month
                </ThemedText>
              </View>
              <View
                style={[
                  styles.planItem,
                  { borderColor: BrandColors.constructionGold, borderWidth: 2, backgroundColor: `${BrandColors.constructionGold}10` },
                ]}
              >
                <ThemedText type="h4" style={{ fontWeight: "700" }}>
                  Team
                </ThemedText>
                <ThemedText type="small" style={{ color: BrandColors.constructionGold, fontWeight: "600" }}>
                  $99/month
                </ThemedText>
              </View>
              <View
                style={[
                  styles.planItem,
                  { borderColor: theme.border, backgroundColor: `${BrandColors.constructionGold}05` },
                ]}
              >
                <ThemedText type="h4" style={{ fontWeight: "700" }}>
                  Enterprise
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Custom
                </ThemedText>
              </View>
            </View>
          </View>

          <Button
            onPress={() => {
              onClose();
              navigation.navigate("Billing");
            }}
            style={styles.upgradeButton}
          >
            View Plans & Upgrade
          </Button>

          <Pressable
            onPress={onClose}
            style={styles.cancelButton}
          >
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Maybe Later
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  container: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxWidth: 400,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
  },
  iconContainer: {
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    marginBottom: Spacing.md,
    textAlign: "center",
    fontWeight: "700",
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  plansPreview: {
    width: "100%",
    marginBottom: Spacing.xl,
  },
  plansLabel: {
    marginBottom: Spacing.md,
    fontWeight: "600",
  },
  plansList: {
    gap: Spacing.md,
  },
  planItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  upgradeButton: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  cancelButton: {
    padding: Spacing.md,
  },
});
