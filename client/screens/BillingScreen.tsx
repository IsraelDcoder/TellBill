/**
 * 🎯 Mobile-First Billing Screen
 * 
 * Zero browser redirects. Pure native IAP via RevenueCat.
 * 
 * Flow:
 * 1. Load offerings from RevenueCat SDK
 * 2. Display plans with store pricing
 * 3. User taps "Upgrade Now"
 * 4. Native iOS/Android subscription UI opens
 * 5. Purchase processed, app verifies with backend
 * 6. Features unlock instantly
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Purchases, {
  PurchasesPackage,
  PurchasesOffering,
  CustomerInfo,
} from "react-native-purchases";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { BrandColors, Spacing, BorderRadius } from "@/constants/theme";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useAuth } from "@/context/AuthContext";

interface PricingTier {
  name: string;
  description: string;
  features: string[];
  package?: PurchasesPackage;
  isPopular?: boolean;
}

export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userEntitlement, setUserEntitlement } = useSubscriptionStore();

  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  /**
   * Get auth token from storage
   */
  useEffect(() => {
    AsyncStorage.getItem("authToken").then((t) => {
      if (t) setToken(t);
    });
  }, []);

  /**
   * Load pricing from RevenueCat
   */
  const loadOfferings = useCallback(async () => {
    try {
      console.log("Loading RevenueCat offerings...");
      const offerings = await Purchases.getOfferings();

      if (offerings.current) {
        console.log("✅ Offerings loaded", { current: offerings.current });
        setOfferings(offerings.current);
      } else {
        Alert.alert("Error", "No pricing found. Please try again later.");
      }
    } catch (error) {
      console.error("Error loading offerings", error);
      Alert.alert("Error", "Failed to load pricing options");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  /**
   * Verify purchase with backend
   */
  const verifyPurchaseWithBackend = useCallback(
    async (customerInfo: CustomerInfo) => {
      try {
        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/billing/restore-purchases`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              revenuecatCustomerInfo: customerInfo,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Backend verification failed");
        }

        console.log("✅ Backend verification success", data);

        // Update local subscription state
        if (data.plan) {
          setUserEntitlement(data.plan);
        }

        return data;
      } catch (error) {
        console.error("Backend verification error", error);
        throw error;
      }
    },
    [token, setUserEntitlement]
  );

  /**
   * Handle purchase
   */
  const handlePurchase = useCallback(
    async (tier: PricingTier) => {
      if (!tier.package) {
        Alert.alert("Error", "Unable to process purchase");
        return;
      }

      try {
        setPurchasing(tier.package.identifier);
        console.log("Starting purchase", { product: tier.package.identifier });

        // Make purchase via RevenueCat SDK
        const { customerInfo } = await Purchases.purchasePackage(tier.package);

        console.log("✅ Purchase successful", { customerInfo });

        // Verify with backend
        const verification = await verifyPurchaseWithBackend(customerInfo);

        Alert.alert(
          "Success",
          `🎉 Upgraded to ${tier.name}!\n\nYour new plan: ${verification.plan}`
        );
      } catch (error: any) {
        if (error.userCancelled) {
          console.log("User cancelled purchase");
        } else {
          console.error("Purchase error", error);
          Alert.alert("Purchase Failed", error.message || "Please try again");
        }
      } finally {
        setPurchasing(null);
      }
    },
    [verifyPurchaseWithBackend]
  );

  /**
   * Handle restore purchases
   */
  const handleRestorePurchases = useCallback(async () => {
    try {
      setPurchasing("restore");
      console.log("Restoring purchases...");

      const customerInfo = await Purchases.restorePurchases();
      console.log("✅ Purchases restored", { customerInfo });

      // Verify with backend
      await verifyPurchaseWithBackend(customerInfo);

      Alert.alert("Success", "✅ Purchases restored!");
    } catch (error) {
      console.error("Restore error", error);
      Alert.alert("Error", "Failed to restore purchases");
    } finally {
      setPurchasing(null);
    }
  }, [verifyPurchaseWithBackend]);

  /**
   * Pricing tiers
   */
  const tiers: PricingTier[] = [
    {
      name: "Solo",
      description: "For individuals",
      features: [
        "✓ 3 invoices/month",
        "✓ Voice recording",
        "✓ PDF export",
        "✓ Email support",
      ],
      package: offerings?.availablePackages.find(
        (p) =>
          p.identifier.includes("solo") ||
          p.identifier.includes("month") ||
          p.identifier.includes("annual")
      ),
    },
    {
      name: "Professional",
      description: "For growing teams",
      features: [
        "✓ Unlimited invoices",
        "✓ Team collaboration",
        "✓ Scope proof photos",
        "✓ Payment links",
        "✓ Priority support",
      ],
      package: offerings?.availablePackages.find(
        (p) =>
          p.identifier.includes("professional") ||
          p.identifier.includes("pro")
      ),
      isPopular: true,
    },
    {
      name: "Enterprise",
      description: "For enterprises",
      features: [
        "✓ Everything in Professional",
        "✓ Custom invoicing",
        "✓ API access",
        "✓ Dedicated support",
        "✓ White-label options",
      ],
      package: offerings?.availablePackages.find(
        (p) => p.identifier.includes("enterprise")
      ),
    },
  ];

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            justifyContent: "center",
            paddingTop: insets.top,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={BrandColors.constructionGold}
        />
        <ThemedText style={{ marginTop: Spacing.lg, textAlign: "center" }}>
          Loading pricing options...
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundRoot, paddingTop: insets.top },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="h2" style={{ marginBottom: Spacing.sm }}>
            Choose Your Plan
          </ThemedText>
          <ThemedText
            type="body"
            style={{ color: theme.textSecondary }}
          >
            Unlock features and grow your business
          </ThemedText>
        </View>

        {/* Annual/Monthly Toggle */}
        <View style={[styles.toggleContainer, { gap: Spacing.md }]}>
          <Pressable
            onPress={() => setIsAnnual(false)}
            style={[
              styles.toggleButton,
              {
                backgroundColor: !isAnnual
                  ? BrandColors.constructionGold
                  : theme.backgroundDefault,
              },
            ]}
          >
            <ThemedText
              style={{
                fontWeight: "bold",
                color: !isAnnual ? BrandColors.white : theme.text,
              }}
            >
              Monthly
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setIsAnnual(true)}
            style={[
              styles.toggleButton,
              {
                backgroundColor: isAnnual
                  ? BrandColors.constructionGold
                  : theme.backgroundDefault,
              },
            ]}
          >
            <ThemedText
              style={{
                fontWeight: "bold",
                color: isAnnual ? BrandColors.white : theme.text,
              }}
            >
              Annual (Save 17%)
            </ThemedText>
          </Pressable>
        </View>

        {/* Pricing Tiers */}
        <View style={styles.tiersContainer}>
          {tiers.map((tier) => (
            <GlassCard
              key={tier.name}
              style={[
                styles.tierCard,
                {
                  borderColor: tier.isPopular
                    ? BrandColors.constructionGold
                    : theme.border,
                  borderWidth: tier.isPopular ? 2 : 1,
                  transform: tier.isPopular ? [{ scale: 1.02 }] : [],
                },
              ]}
            >
              {tier.isPopular && (
                <View
                  style={[
                    styles.popularBadge,
                    {
                      backgroundColor: BrandColors.constructionGold,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{
                      color: BrandColors.white,
                      fontWeight: "bold",
                    }}
                  >
                    MOST POPULAR
                  </ThemedText>
                </View>
              )}

              <ThemedText type="h2" style={styles.tierName}>
                {tier.name}
              </ThemedText>

              <ThemedText
                type="small"
                style={{
                  color: theme.textSecondary,
                  marginBottom: Spacing.lg,
                }}
              >
                {tier.description}
              </ThemedText>

              {/* Price */}
              <View style={styles.priceContainer}>
                <ThemedText
                  type="h1"
                  style={{ color: BrandColors.constructionGold }}
                >
                  {tier.package
                    ? tier.package.product.priceString
                    : "Contact us"}
                </ThemedText>
                {tier.package?.product.subscriptionPeriod && (
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary }}
                  >
                    /{tier.package.product.subscriptionPeriod}
                  </ThemedText>
                )}
              </View>

              {/* CTA Button */}
              <Button
                variant="primary"
                onPress={() => handlePurchase(tier)}
                disabled={purchasing !== null}
                style={styles.ctaButton}
              >
                {purchasing === tier.package?.identifier ? (
                  <ActivityIndicator
                    size="small"
                    color={BrandColors.white}
                  />
                ) : (
                  <>
                    <Feather
                      name="credit-card"
                      size={16}
                      color={BrandColors.white}
                      style={{ marginRight: Spacing.sm }}
                    />
                    <ThemedText
                      style={{
                        color: BrandColors.white,
                        fontWeight: "bold",
                      }}
                    >
                      {userEntitlement === tier.name.toLowerCase()
                        ? "Your Plan"
                        : "Upgrade Now"}
                    </ThemedText>
                  </>
                )}
              </Button>

              {/* Features List */}
              <View style={styles.featuresList}>
                {tier.features.map((feature) => (
                  <View key={feature} style={styles.featureItem}>
                    <Feather
                      name="check-circle"
                      size={14}
                      color={BrandColors.constructionGold}
                      style={{ marginRight: Spacing.sm }}
                    />
                    <ThemedText type="small">{feature}</ThemedText>
                  </View>
                ))}
              </View>
            </GlassCard>
          ))}
        </View>

        {/* Restore Purchases */}
        <Button
          variant="outline"
          onPress={handleRestorePurchases}
          disabled={purchasing !== null}
          style={styles.restoreButton}
        >
          <Feather
            name="refresh-cw"
            size={16}
            color={theme.text}
            style={{ marginRight: Spacing.sm }}
          />
          <ThemedText>Restore Purchases</ThemedText>
        </Button>

        {/* Legal Text */}
        <View style={styles.legalText}>
          <ThemedText
            type="small"
            style={{
              color: theme.textSecondary,
              textAlign: "center",
            }}
          >
            Subscriptions renew automatically. Cancel anytime in your device
            settings.
            {"\n\n"}
            iOS: Settings → [Your Name] → Subscriptions
            {"\n"}
            Android: Google Play → Account → Subscriptions
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  header: {
    marginBottom: Spacing["3xl"],
  },
  toggleContainer: {
    flexDirection: "row",
    marginBottom: Spacing["3xl"],
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  tiersContainer: {
    gap: Spacing.lg,
    marginBottom: Spacing["3xl"],
  },
  tierCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  popularBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
    marginBottom: Spacing.md,
  },
  tierName: {
    marginBottom: Spacing.sm,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    marginVertical: Spacing.lg,
    flexDirection: "row",
    justifyContent: "center",
  },
  featuresList: {
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  restoreButton: {
    marginBottom: Spacing.lg,
    flexDirection: "row",
    justifyContent: "center",
  },
  legalText: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
});
