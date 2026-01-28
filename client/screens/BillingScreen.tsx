import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useProfileStore } from "@/stores/profileStore";
import { useSubscriptionStore, PLAN_LIMITS } from "@/stores/subscriptionStore";
import { useFlutterwavePayment } from "@/hooks/useFlutterwavePayment";
import { Spacing, BorderRadius, BrandColors, Shadows } from "@/constants/theme";

interface PlanCardProps {
  name: string;
  price: string;
  period: string;
  badge: string;
  tagline: string;
  color: string;
  features: string[];
  isCurrent: boolean;
  isPopular?: boolean;
  onSelect: () => void;
  isLoading?: boolean;
}

function PlanCard({
  name,
  price,
  period,
  badge,
  tagline,
  color,
  features,
  isCurrent,
  isPopular,
  onSelect,
  isLoading,
}: PlanCardProps) {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.planCard,
        {
          backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot,
          borderColor: isCurrent ? color : theme.border,
          borderWidth: isCurrent ? 2 : 1,
        },
        isCurrent ? Shadows.md : {},
      ]}
    >
      {isPopular ? (
        <View style={[styles.popularBadge, { backgroundColor: color }]}>
          <ThemedText type="small" style={styles.popularText}>
            {badge}
          </ThemedText>
        </View>
      ) : null}

      <ThemedText type="h3" style={{ color: isCurrent ? color : undefined }}>
        {name}
      </ThemedText>

      <ThemedText type="body" style={{ color: theme.textSecondary, marginVertical: Spacing.sm }}>
        {tagline}
      </ThemedText>

      <View style={styles.priceRow}>
        <ThemedText type="h2" style={{ color }}>
          {price}
        </ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          {period}
        </ThemedText>
      </View>

      {!isPopular && (
        <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
          {badge}
        </ThemedText>
      )}

      <View style={styles.featuresList}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <ThemedText type="small">{feature}</ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          variant={isCurrent ? "secondary" : "primary"}
          onPress={onSelect}
          disabled={isCurrent || isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingContent}>
              <ActivityIndicator
                size="small"
                color={isCurrent ? color : "#fff"}
              />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                Processing...
              </ThemedText>
            </View>
          ) : isCurrent ? (
            "Current Plan"
          ) : (
            "Upgrade Now"
          )}
        </Button>
      </View>
    </View>
  );
}

export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { currentPlan, pricingTiers, isSubscribed } = useSubscriptionStore();
  const { user } = useAuth();
  const { userProfile, companyInfo } = useProfileStore();
  const { isProcessing, initiatePayment } = useFlutterwavePayment();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgradePress = async (planId: string) => {
    // Get user email - try auth context first, then profileStore
    const userEmail = user?.email;
    
    // Get user name - combine firstName and lastName from profileStore, or use auth context
    const userFullName = userProfile.firstName || userProfile.lastName
      ? `${userProfile.firstName} ${userProfile.lastName}`.trim()
      : user?.name;

    // Validate we have at least email
    if (!userEmail) {
      Alert.alert(
        "Missing Information",
        "We need your email to process the payment. Please sign in again or complete your profile."
      );
      return;
    }

    // Validate we have a name (use generic default if not)
    if (!userFullName || userFullName.trim().length === 0) {
      Alert.alert(
        "Missing Name",
        "Please add your name in your profile before upgrading."
      );
      return;
    }

    setLoadingPlan(planId);

    const planName =
      planId.charAt(0).toUpperCase() + planId.slice(1);

    const userPhone = companyInfo.phone || "+1234567890";

    await initiatePayment(
      planId as "solo" | "professional" | "enterprise",
      planName,
      userEmail,
      userPhone,
      userFullName.trim() || "User"
    );

    setLoadingPlan(null);
  };

  // Build plans array with current pricing from store
  const plans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "forever",
      badge: "Trial Only",
      tagline: "This works… but I can't run my business like this.",
      features: [
        "✅ 3 voice recordings (lifetime)",
        "✅ 3 invoices (lifetime)",
        "✅ Email invoice delivery",
        "❌ No projects",
        "❌ No receipt scanning",
        "❌ No client approvals",
      ],
      isCurrent: currentPlan === "free",
      isPopular: false,
      color: BrandColors.slateGrey,
    },
    {
      id: "solo",
      name: "Solo",
      price: "$29",
      period: "/month",
      badge: "Get Organized",
      tagline: "I'm faster and organized… but extras can still slip.",
      features: [
        "✅ Unlimited voice-to-invoice",
        "✅ Unlimited invoices",
        "✅ Projects (manual)",
        "✅ Receipt scanning",
        "✅ Payment tracking",
        "✅ Email & WhatsApp delivery",
        "❌ No scope proof & approval",
      ],
      isCurrent: currentPlan === "solo",
      isPopular: false,
      color: "#3B82F6",
    },
    {
      id: "professional",
      name: "Professional",
      price: "$79",
      period: "/month",
      badge: "⭐ Most Popular",
      tagline: "Never do unpaid work again.",
      features: [
        "✅ Everything in Solo",
        "✅ Scope proof & client approval",
        "✅ Auto-add approved work",
        "✅ Photo proof with timestamps",
        "✅ Approval reminders",
        "✅ Dispute-ready work logs",
        "✅ Unlimited projects",
      ],
      isCurrent: currentPlan === "professional",
      isPopular: true,
      color: BrandColors.constructionGold,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "$299",
      period: "/month",
      badge: "Revenue Infrastructure",
      tagline: "This runs part of my business.",
      features: [
        "✅ Everything in Professional",
        "✅ Unlimited usage everywhere",
        "✅ Advanced analytics",
        "✅ API access",
        "✅ Custom branding",
        "✅ Priority support",
        "✅ Dedicated account contact",
      ],
      isCurrent: currentPlan === "enterprise",
      isPopular: false,
      color: "#8B5CF6",
    },
  ];

  const paymentHistory = isSubscribed && currentPlan !== "free" ? [
    { date: "Jan 1, 2026", amount: currentPlan === "professional" ? "$79.00" : currentPlan === "solo" ? "$29.00" : "$299.00", status: "Paid" },
    { date: "Dec 1, 2025", amount: currentPlan === "professional" ? "$79.00" : currentPlan === "solo" ? "$29.00" : "$299.00", status: "Paid" },
    { date: "Nov 1, 2025", amount: currentPlan === "professional" ? "$79.00" : currentPlan === "solo" ? "$29.00" : "$299.00", status: "Paid" },
  ] : [];

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
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              CURRENT PLAN
            </ThemedText>
            <ThemedText type="h2">
              {plans.find((p) => p.isCurrent)?.name || "Free"}
            </ThemedText>
          </View>
          <View
            style={[
              styles.activeBadge,
              {
                backgroundColor:
                  currentPlan === "free"
                    ? `${BrandColors.warning}20`
                    : `${BrandColors.success}20`,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: currentPlan === "free" ? BrandColors.warning : BrandColors.success,
                fontWeight: "600",
              }}
            >
              {currentPlan === "free" ? "Free" : "Active"}
            </ThemedText>
          </View>
        </View>
        {isSubscribed && currentPlan !== "free" ? (
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Next billing date: February 1, 2026
          </ThemedText>
        ) : (
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Upgrade to Professional ($79/month) to protect your revenue with Scope Proof and client approvals
          </ThemedText>
        )}
      </GlassCard>

      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Available Plans
        </ThemedText>
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.id}
            name={plan.name}
            price={plan.price}
            period={plan.period}
            badge={plan.badge}
            tagline={plan.tagline}
            color={plan.color}
            features={plan.features}
            isCurrent={plan.isCurrent || false}
            isPopular={plan.isPopular}
            isLoading={loadingPlan === plan.id && isProcessing}
            onSelect={() => {
              if (plan.id !== "free") {
                handleUpgradePress(plan.id);
              }
            }}
          />
        ))}
      </View>

      {paymentHistory.length > 0 && (
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
                    {plans.find((p) => p.isCurrent)?.name || "Free"} Plan
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
                      type="small"
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
      )}

      {isSubscribed && currentPlan !== "free" && (
        <Pressable style={styles.cancelLink}>
          <ThemedText type="body" style={{ color: theme.error }}>
            Cancel Subscription
          </ThemedText>
        </Pressable>
      )}
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
  buttonContainer: {
    marginTop: Spacing.md,
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
