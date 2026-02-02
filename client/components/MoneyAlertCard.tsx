import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { MoneyAlert } from "@/stores/moneyAlertsStore";

interface MoneyAlertCardProps {
  alert: MoneyAlert;
  onFix: (alert: MoneyAlert) => void;
  onResolve: (alert: MoneyAlert) => void;
}

const alertTypeConfig = {
  RECEIPT_UNBILLED: {
    label: "Unbilled Receipt",
    icon: "file-text",
    color: BrandColors.constructionGold,
  },
  SCOPE_APPROVED_NO_INVOICE: {
    label: "Approved Work Not Invoiced",
    icon: "check-circle",
    color: BrandColors.constructionGold,
  },
  VOICE_LOG_NO_INVOICE: {
    label: "Voice Log Not Invoiced",
    icon: "mic",
    color: BrandColors.constructionGold,
  },
  INVOICE_NOT_SENT: {
    label: "Invoice Draft Not Sent",
    icon: "send",
    color: "#f97316",
  },
};

const confidenceLabel = (confidence?: number): string => {
  if (!confidence) return "Medium";
  if (confidence >= 85) return "High";
  if (confidence >= 70) return "Medium";
  return "Low";
};

export function MoneyAlertCard({ alert, onFix, onResolve }: MoneyAlertCardProps) {
  const { theme, isDark } = useTheme();
  const config = alertTypeConfig[alert.type as keyof typeof alertTypeConfig];
  const timeAgo = getTimeAgo(new Date(alert.createdAt));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundSecondary,
          borderColor: theme.textSecondary,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.typeChip}>
          <Feather name={config.icon as any} size={14} color={config.color} />
          <ThemedText type="small" style={{ marginLeft: Spacing.xs, color: config.color }}>
            {config.label}
          </ThemedText>
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {timeAgo}
        </ThemedText>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {alert.clientName && (
          <ThemedText type="body" style={{ marginBottom: Spacing.xs }}>
            {alert.clientName}
          </ThemedText>
        )}

        {alert.estimatedAmount && (
          <View style={styles.amountRow}>
            <ThemedText type="h4" style={{ color: BrandColors.constructionGold }}>
              ${alert.estimatedAmount}
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}
            >
              {confidenceLabel(alert.confidence)} confidence
            </ThemedText>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: BrandColors.constructionGold,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={() => onFix(alert)}
        >
          <Feather name="check" size={16} color="white" style={{ marginRight: Spacing.xs }} />
          <ThemedText type="body" style={{ color: "white", fontWeight: "600" }}>
            Fix It
          </ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: isDark
                ? theme.backgroundRoot
                : theme.backgroundRoot,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={() => onResolve(alert)}
        >
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Resolve
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(217, 119, 6, 0.1)",
  },
  content: {
    marginBottom: Spacing.lg,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButton: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
});
