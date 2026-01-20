import React, { useEffect } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";

const PLAN_BENEFITS = {
  solo: [
    "Unlimited voice recordings",
    "Unlimited invoice creation",
    "Advanced invoice templates",
    "Payment tracking",
    "Recurring invoices",
    "Email support",
  ],
  team: [
    "Everything in Solo",
    "Team management",
    "Multiple projects",
    "Team permissions",
    "Priority support",
    "Custom branding",
  ],
  enterprise: [
    "Everything in Team",
    "API access",
    "Custom integrations",
    "SSO/SAML",
    "Dedicated account manager",
    "Custom SLA",
  ],
};

interface PaymentSuccessScreenProps {
  route?: { params?: { planId?: "solo" | "team" | "enterprise" } };
}

export default function PaymentSuccessScreen(props: PaymentSuccessScreenProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const { currentPlan } = useSubscriptionStore();

  const planId = props.route?.params?.planId || currentPlan;
  const planName = planId.charAt(0).toUpperCase() + planId.slice(1);
  const benefits = PLAN_BENEFITS[planId as keyof typeof PLAN_BENEFITS] || [];

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      navigation.navigate("Main");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigation]);

  const handleContinue = () => {
    navigation.navigate("Main");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Success Icon */}
      <View style={styles.iconContainer}>
        <View
          style={[
            styles.iconBackground,
            { backgroundColor: `${BrandColors.success}20` },
          ]}
        >
          <Feather
            name="check-circle"
            size={60}
            color={BrandColors.success}
          />
        </View>
      </View>

      {/* Success Message */}
      <View style={styles.messageContainer}>
        <ThemedText type="h1" style={styles.title}>
          Welcome to the {planName} Plan!
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Your payment was successful. You now have access to all {planName} features.
        </ThemedText>
      </View>

      {/* Features List */}
      <GlassCard style={styles.featuresCard}>
        <ThemedText type="h3" style={styles.featuresTitle}>
          You now have access to:
        </ThemedText>

        <View style={styles.featuresList}>
          {benefits.map((benefit, index) => (
            <View key={index} style={styles.featureRow}>
              <Feather
                name="check"
                size={18}
                color={BrandColors.constructionGold}
              />
              <ThemedText type="body" style={styles.featureText}>
                {benefit}
              </ThemedText>
            </View>
          ))}
        </View>
      </GlassCard>

      {/* Info Card */}
      <GlassCard style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Feather
            name="info"
            size={20}
            color={BrandColors.constructionGold}
            style={styles.infoIcon}
          />
          <ThemedText type="small" style={{ flex: 1, lineHeight: 20 }}>
            Billing information has been sent to your email. You can manage your subscription anytime in Settings.
          </ThemedText>
        </View>
      </GlassCard>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <Button onPress={handleContinue}>
          Continue to App
        </Button>
      </View>

      {/* Skip Text */}
      <Pressable style={styles.skipLink}>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, textAlign: "center" }}
        >
          This screen will close automatically in a few seconds
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
    marginTop: Spacing.lg,
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  messageContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 22,
  },
  featuresCard: {
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
  },
  featuresTitle: {
    marginBottom: Spacing.lg,
  },
  featuresList: {
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  featureText: {
    flex: 1,
    lineHeight: 22,
  },
  infoCard: {
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  infoIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  buttonContainer: {
    marginBottom: Spacing.lg,
  },
  skipLink: {
    paddingVertical: Spacing.lg,
  },
});
