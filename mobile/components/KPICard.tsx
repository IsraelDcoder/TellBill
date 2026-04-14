import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { GlassCard } from "@/components/GlassCard";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors, Typography } from "@/constants/theme";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onPress?: () => void;
}

export function KPICard({ title, value, icon, trend, onPress }: KPICardProps) {
  const { theme } = useTheme();

  return (
    <GlassCard onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${BrandColors.constructionGold}20` },
          ]}
        >
          <Feather
            name={icon}
            size={20}
            color={BrandColors.constructionGold}
          />
        </View>
        {trend ? (
          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor: trend.isPositive
                  ? `${theme.success}20`
                  : `${theme.error}20`,
              },
            ]}
          >
            <Feather
              name={trend.isPositive ? "trending-up" : "trending-down"}
              size={12}
              color={trend.isPositive ? theme.success : theme.error}
            />
            <ThemedText
              style={[
                styles.trendText,
                { color: trend.isPositive ? theme.success : theme.error },
              ]}
            >
              {trend.value}%
            </ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedText type="h2" style={styles.value}>
        {value}
      </ThemedText>
      <ThemedText
        type="small"
        style={[styles.title, { color: theme.textSecondary }]}
      >
        {title}
      </ThemedText>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: "600",
  },
  value: {
    marginBottom: Spacing.xs,
  },
  title: {
    opacity: 0.8,
  },
});
