import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";

export type ActivityStatus = "sent" | "paid" | "pending" | "overdue";

interface ActivityItemProps {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  status: ActivityStatus;
  date: string;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const statusConfig: Record<
  ActivityStatus,
  { color: string; icon: keyof typeof Feather.glyphMap; label: string }
> = {
  sent: { color: "#3B82F6", icon: "send", label: "Sent" },
  paid: { color: "#22C55E", icon: "check-circle", label: "Paid" },
  pending: { color: "#F59E0B", icon: "clock", label: "Pending" },
  overdue: { color: "#EF4444", icon: "alert-circle", label: "Overdue" },
};

export function ActivityItem({
  clientName,
  invoiceNumber,
  amount,
  status,
  date,
  onPress,
}: ActivityItemProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const config = statusConfig[status];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? theme.backgroundDefault
            : theme.backgroundRoot,
          borderColor: theme.border,
        },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${config.color}15` },
        ]}
      >
        <Feather name={config.icon} size={18} color={config.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <ThemedText type="body" style={styles.clientName} numberOfLines={1}>
            {clientName}
          </ThemedText>
          <ThemedText type="h4" style={styles.amount}>
            {formatCurrency(amount)}
          </ThemedText>
        </View>
        <View style={styles.bottomRow}>
          <ThemedText
            type="caption"
            style={[styles.invoiceNumber, { color: theme.textSecondary }]}
          >
            {invoiceNumber}
          </ThemedText>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${config.color}20` },
              ]}
            >
              <ThemedText
                type="caption"
                style={[styles.statusText, { color: config.color }]}
              >
                {config.label}
              </ThemedText>
            </View>
            <ThemedText
              type="caption"
              style={[styles.date, { color: theme.textSecondary }]}
            >
              {date}
            </ThemedText>
          </View>
        </View>
      </View>
      <Feather
        name="chevron-right"
        size={18}
        color={theme.textSecondary}
        style={styles.chevron}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  clientName: {
    fontWeight: "600",
    flex: 1,
    marginRight: Spacing.sm,
  },
  amount: {
    color: BrandColors.constructionGold,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  invoiceNumber: {
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontWeight: "600",
  },
  date: {},
  chevron: {
    marginLeft: Spacing.sm,
  },
});
