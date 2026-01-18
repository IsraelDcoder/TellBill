import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors, Shadows } from "@/constants/theme";

interface PlanCardProps {
  name: string;
  price: string;
  features: string[];
  isCurrent: boolean;
  isPopular?: boolean;
  onSelect: () => void;
}

function PlanCard({
  name,
  price,
  features,
  isCurrent,
  isPopular,
  onSelect,
}: PlanCardProps) {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.planCard,
        {
          backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot,
          borderColor: isCurrent ? BrandColors.constructionGold : theme.border,
          borderWidth: isCurrent ? 2 : 1,
        },
        isCurrent ? Shadows.md : {},
      ]}
    >
      {isPopular ? (
        <View style={styles.popularBadge}>
          <ThemedText type="caption" style={styles.popularText}>
            Most Popular
          </ThemedText>
        </View>
      ) : null}

      <ThemedText type="h3">{name}</ThemedText>
      <View style={styles.priceRow}>
        <ThemedText type="display" style={{ color: BrandColors.constructionGold }}>
          {price}
        </ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          /month
        </ThemedText>
      </View>

      <View style={styles.featuresList}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Feather name="check" size={16} color={BrandColors.constructionGold} />
            <ThemedText type="small">{feature}</ThemedText>
          </View>
        ))}
      </View>

      <Button
        variant={isCurrent ? "secondary" : "primary"}
        onPress={onSelect}
        disabled={isCurrent}
      >
        {isCurrent ? "Current Plan" : "Upgrade"}
      </Button>
    </View>
  );
}

export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();

  const plans = [
    {
      name: "Solo",
      price: "$29",
      features: [
        "Unlimited invoices",
        "Voice recording",
        "PDF export",
        "Payment links",
        "Email support",
      ],
      isCurrent: true,
    },
    {
      name: "Team",
      price: "$99",
      features: [
        "Everything in Solo",
        "Up to 10 team members",
        "Team analytics",
        "Project management",
        "Priority support",
      ],
      isPopular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      features: [
        "Everything in Team",
        "Unlimited team members",
        "White-label branding",
        "API access",
        "Dedicated support",
      ],
    },
  ];

  const paymentHistory = [
    { date: "Jan 1, 2026", amount: "$29.00", status: "Paid" },
    { date: "Dec 1, 2025", amount: "$29.00", status: "Paid" },
    { date: "Nov 1, 2025", amount: "$29.00", status: "Paid" },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={styles.currentPlanCard}>
        <View style={styles.currentPlanHeader}>
          <View>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              CURRENT PLAN
            </ThemedText>
            <ThemedText type="h2">Solo</ThemedText>
          </View>
          <View
            style={[
              styles.activeBadge,
              { backgroundColor: `${BrandColors.success}20` },
            ]}
          >
            <ThemedText
              type="small"
              style={{ color: BrandColors.success, fontWeight: "600" }}
            >
              Active
            </ThemedText>
          </View>
        </View>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Next billing date: February 1, 2026
        </ThemedText>
      </GlassCard>

      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Available Plans
        </ThemedText>
        {plans.map((plan, index) => (
          <PlanCard
            key={index}
            {...plan}
            isCurrent={plan.isCurrent || false}
            onSelect={() => {}}
          />
        ))}
      </View>

      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Payment History
        </ThemedText>
        <View
          style={[
            styles.historyContainer,
            {
              backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundSecondary,
            },
          ]}
        >
          {paymentHistory.map((payment, index) => (
            <View
              key={index}
              style={[
                styles.historyRow,
                index < paymentHistory.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <View>
                <ThemedText type="body">{payment.date}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Solo Plan
                </ThemedText>
              </View>
              <View style={styles.historyRight}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {payment.amount}
                </ThemedText>
                <View
                  style={[
                    styles.paidBadge,
                    { backgroundColor: `${BrandColors.success}15` },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: BrandColors.success, fontWeight: "600" }}
                  >
                    {payment.status}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Pressable style={styles.cancelLink}>
        <ThemedText type="body" style={{ color: theme.error }}>
          Cancel Subscription
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  currentPlanCard: {
    marginBottom: Spacing.xl,
  },
  currentPlanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  activeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  planCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    position: "relative",
    overflow: "hidden",
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: BrandColors.constructionGold,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderBottomLeftRadius: BorderRadius.md,
  },
  popularText: {
    color: BrandColors.slateGrey,
    fontWeight: "700",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.xs,
    marginVertical: Spacing.md,
  },
  featuresList: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  historyContainer: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  historyRight: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  paidBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cancelLink: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
});
