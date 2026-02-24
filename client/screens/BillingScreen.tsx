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

import React, { useEffect, useState, useCallback, useRef } from "react";
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
import { Dimensions } from "react-native";

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
  const scrollRef = useRef<ScrollView>(null);
  const [activePlan, setActivePlan] = useState(0); // 0 = Solo, 1 = Professional
  const screenWidth = Dimensions.get("window").width;

  // Pricing values
  const soloMonthly = "$9";
  const soloAnnual = "$90";
  const professionalMonthly = "$24";
  const professionalAnnual = "$240";

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
      description: "For solo contractors & freelancers",
      features: [
        "Unlimited voice-to-invoice recording",
        "Unlimited invoices",
        "Basic invoicing",
        "Payment tracking",
      ],
      package: offerings?.availablePackages.find(
        (p) =>
          p.identifier.includes("solo") &&
          !p.identifier.includes("professional")
      ),
    },
    {
      name: "Professional",
      description: "Money protection for growing contractors",
      features: [
        "Protect against unpaid work",
        "Prevent scope creep disputes",
        "Prove extra work was approved",
        "Automatic payment reminders",
        "Priority email support",
      ],
      package: offerings?.availablePackages.find(
        (p) => p.identifier.includes("professional")
      ),
      isPopular: true,
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
        {/* Premium Header Section */}
        <View style={{ alignItems: "center", marginBottom: Spacing["3xl"] }}>
          <ThemedText
            type="h1"
            style={{
              fontSize: 34,
              fontWeight: "900",
              marginBottom: Spacing.md,
              letterSpacing: 0.5,
              color: BrandColors.constructionGold,
              textAlign: "center",
            }}
          >
            Unlock Your Business Potential
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 18,
              color: theme.textSecondary,
              lineHeight: 26,
              marginBottom: Spacing.xl,
              textAlign: "center",
              maxWidth: 340,
            }}
          >
            Choose a plan trusted by top contractors. Enjoy priority support, enterprise-grade security, and features that scale with your ambition.
          </ThemedText>
          <View style={{ flexDirection: "row", gap: Spacing.lg, marginBottom: Spacing.xl }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: BrandColors.constructionGold + '22', borderRadius: 16, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs }}>
              <Feather name="award" size={16} color={BrandColors.constructionGold} />
              <ThemedText style={{ color: BrandColors.constructionGold, fontWeight: "700", marginLeft: Spacing.xs, fontSize: 13 }}>Top Rated Support</ThemedText>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: BrandColors.constructionGold + '22', borderRadius: 16, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs }}>
              <Feather name="shield" size={16} color={BrandColors.constructionGold} />
              <ThemedText style={{ color: BrandColors.constructionGold, fontWeight: "700", marginLeft: Spacing.xs, fontSize: 13 }}>Enterprise Security</ThemedText>
            </View>
          </View>
        </View>

        {/* Annual/Monthly Toggle */}
        <View style={styles.toggleContainer}>
          <Pressable
            onPress={() => setIsAnnual(false)}
            style={[
              styles.toggleButton,
              {
                backgroundColor: !isAnnual
                  ? BrandColors.constructionGold
                  : "transparent",
              },
            ]}
          >
            <ThemedText
              style={{
                fontWeight: "600",
                color: !isAnnual ? BrandColors.white : theme.text,
                fontSize: 16,
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
                  : "transparent",
              },
            ]}
          >
            <ThemedText
              style={{
                fontWeight: "600",
                color: isAnnual ? BrandColors.white : theme.text,
                fontSize: 16,
              }}
            >
              Annual (Save 17%)
            </ThemedText>
          </Pressable>
        </View>

        {/* Scrollable Plans */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={screenWidth * 0.85}
          decelerationRate="fast"
          contentContainerStyle={{ alignItems: "center", paddingVertical: Spacing.lg }}
          onMomentumScrollEnd={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / (screenWidth * 0.85));
            setActivePlan(idx);
          }}
          style={{ marginBottom: Spacing["2xl"] }}
        >
          {/* Solo Card */}
          <View
            style={[
              styles.tierCard,
              {
                borderColor: activePlan === 0 ? BrandColors.constructionGold : theme.border,
                borderWidth: activePlan === 0 ? 2 : 1,
                backgroundColor: theme.backgroundDefault,
                width: screenWidth * 0.8,
                marginRight: Spacing.lg,
                opacity: activePlan === 0 ? 1 : 0.85,
                transform: [{ scale: activePlan === 0 ? 1.04 : 1 }],
              },
            ]}
          >
            <ThemedText
              type="h2"
              style={[styles.tierName, { fontSize: 24, fontWeight: "600", color: activePlan === 0 ? BrandColors.constructionGold : theme.text }]}>
              Solo Plan
            </ThemedText>

            <ThemedText
              type="body"
              style={{
                color: theme.textSecondary,
                marginBottom: Spacing.lg,
                fontSize: 14,
              }}
            >
              For solo contractors & freelancers
            </ThemedText>

            {/* Price */}
            <View style={{ marginBottom: Spacing.lg }}>
              <View style={styles.priceRow}>
                <ThemedText
                  style={{
                    fontSize: 32,
                    fontWeight: "700",
                    color: BrandColors.constructionGold,
                  }}
                >
                  {isAnnual ? soloAnnual : soloMonthly}
                </ThemedText>
                <ThemedText
                  style={{
                    fontSize: 16,
                    color: theme.textSecondary,
                    paddingLeft: Spacing.sm,
                  }}
                >
                  {isAnnual ? "/ year" : "/ month"}
                </ThemedText>
              </View>
              {isAnnual && (
                <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: Spacing.xs }}>
                  Save 17%
                </ThemedText>
              )}
            </View>

            {/* Features List */}
            <View style={styles.featuresList}>
              {[
                "Unlimited voice-to-invoice recording",
                "Unlimited invoices",
                "Basic invoicing",
                "Payment tracking",
              ].map((feature) => (
                <View key={feature} style={styles.featureItem}>
                  <Feather
                    name="check"
                    size={18}
                    color={BrandColors.constructionGold}
                    style={{ marginRight: Spacing.md }}
                  />
                  <ThemedText
                    type="body"
                    style={{ color: theme.text, fontSize: 14 }}
                  >
                    {feature}
                  </ThemedText>
                </View>
              ))}
            </View>

            {/* CTA Button */}
            <Pressable
              onPress={() => handlePurchase(tiers[0])}
              disabled={purchasing !== null}
              style={[
                styles.ctaButton,
                {
                  backgroundColor: activePlan === 0 ? BrandColors.constructionGold : theme.border,
                  marginTop: Spacing.xl,
                },
              ]}
            >
              {purchasing === tiers[0].package?.identifier ? (
                <ActivityIndicator
                  size="small"
                  color={BrandColors.white}
                />
              ) : (
                <ThemedText
                  style={{
                    color: BrandColors.white,
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  {activePlan === 0 ? "Selected" : "Select Solo"}
                </ThemedText>
              )}
            </Pressable>

            <ThemedText
              style={{
                fontSize: 12,
                color: theme.textSecondary,
                textAlign: "center",
                marginTop: Spacing.sm,
              }}
            >
              $9 / month
            </ThemedText>
          </View>

          {/* Professional Card - Featured */}
          <View
            style={[
              styles.tierCard,
              {
                borderColor: activePlan === 1 ? BrandColors.constructionGold : theme.border,
                borderWidth: activePlan === 1 ? 2 : 1,
                backgroundColor: theme.backgroundDefault,
                width: screenWidth * 0.8,
                opacity: activePlan === 1 ? 1 : 0.85,
                transform: [{ scale: activePlan === 1 ? 1.04 : 1 }],
              },
            ]}
          >
            <View style={{ alignItems: "center", marginBottom: Spacing.md }}>
              <Feather name="star" size={18} color={BrandColors.constructionGold} />
              <ThemedText style={{ color: BrandColors.constructionGold, fontWeight: "800", fontSize: 13, letterSpacing: 1, marginTop: Spacing.xs }}>MOST POPULAR</ThemedText>
            </View>

            <ThemedText
              type="h2"
              style={[styles.tierName, { fontSize: 24, fontWeight: "600", color: activePlan === 1 ? BrandColors.constructionGold : theme.text }]}>
              Professional Plan
            </ThemedText>

            <ThemedText
              type="body"
              style={{
                color: theme.textSecondary,
                marginBottom: Spacing.lg,
                fontSize: 14,
              }}
            >
              Money protection for growing contractors
            </ThemedText>

            {/* Price */}
            <View style={{ marginBottom: Spacing.lg }}>
              <View style={styles.priceRow}>
                <ThemedText
                  style={{
                    fontSize: 32,
                    fontWeight: "700",
                    color: BrandColors.constructionGold,
                  }}
                >
                  {isAnnual ? professionalAnnual : professionalMonthly}
                </ThemedText>
                <ThemedText
                  style={{
                    fontSize: 16,
                    color: theme.textSecondary,
                    paddingLeft: Spacing.sm,
                  }}
                >
                  {isAnnual ? "/ year" : "/ month"}
                </ThemedText>
              </View>
              {isAnnual && (
                <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: Spacing.xs }}>
                  Save 17%
                </ThemedText>
              )}
            </View>

            {/* Features List */}
            <View style={styles.featuresList}>
              <ThemedText
                type="body"
                style={{
                  color: theme.text,
                  fontWeight: "600",
                  marginBottom: Spacing.md,
                  fontSize: 14,
                }}
              >
                Everything in Solo, plus:
              </ThemedText>
              {[
                "Protect against unpaid work",
                "Prevent scope creep disputes",
                "Prove extra work was approved",
                "Automatic payment reminders",
                "Priority email support",
              ].map((feature) => (
                <View key={feature} style={styles.featureItem}>
                  <Feather
                    name="check"
                    size={18}
                    color={BrandColors.constructionGold}
                    style={{ marginRight: Spacing.md }}
                  />
                  <ThemedText
                    type="body"
                    style={{ color: theme.text, fontSize: 14 }}
                  >
                    {feature}
                  </ThemedText>
                </View>
              ))}
            </View>

            {/* CTA Button */}
            <Pressable
              onPress={() => handlePurchase(tiers[1])}
              disabled={purchasing !== null}
              style={[
                styles.ctaButton,
                {
                  backgroundColor: activePlan === 1 ? BrandColors.constructionGold : theme.border,
                  marginTop: Spacing.xl,
                },
              ]}
            >
              {purchasing === tiers[1].package?.identifier ? (
                <ActivityIndicator
                  size="small"
                  color={BrandColors.white}
                />
              ) : (
                <ThemedText
                  style={{
                    color: BrandColors.white,
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  {activePlan === 1 ? "Selected" : "Select Professional"}
                </ThemedText>
              )}
            </Pressable>

            <ThemedText
              style={{
                fontSize: 12,
                color: theme.textSecondary,
                textAlign: "center",
                marginTop: Spacing.sm,
              }}
            >
              7-day free trial. Cancel anytime.
            </ThemedText>
          </View>
        </ScrollView>

        {/* Plan indicator dots */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: Spacing.xl }}>
          {[0, 1].map(idx => (
            <View
              key={idx}
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                marginHorizontal: 6,
                backgroundColor: activePlan === idx ? BrandColors.constructionGold : theme.border,
              }}
            />
          ))}
        </View>

        {/* Restore Purchases */}
        <Pressable
          onPress={handleRestorePurchases}
          disabled={purchasing !== null}
          style={styles.restoreButton}
        >
          <Feather
            name="refresh-cw"
            size={18}
            color={BrandColors.constructionGold}
            style={{ marginRight: Spacing.sm }}
          />
          <ThemedText
            style={{
              color: BrandColors.constructionGold,
              fontWeight: "600",
              fontSize: 14,
            }}
          >
            Restore Purchases
          </ThemedText>
        </Pressable>

        {/* Legal Text */}
        <View style={styles.legalText}>
          <ThemedText
            type="small"
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            Subscriptions renew automatically. Cancel anytime in your Google Play settings.
          </ThemedText>
        </View>

        {/* Enterprise Contact */}
        <View style={styles.enterpriseContact}>
          <ThemedText
            type="small"
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              fontSize: 14,
            }}
          >
            Need enterprise tools?{" "}
            <ThemedText
              type="small"
              style={{
                color: BrandColors.constructionGold,
                fontWeight: "700",
              }}
              onPress={() =>
                Alert.alert(
                  "Contact Sales",
                  "Email us at support@tellbill.app to discuss enterprise solutions."
                )
              }
            >
              Contact us
            </ThemedText>
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
    gap: Spacing.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tiersContainer: {
    gap: Spacing.lg,
    marginBottom: Spacing["3xl"],
    flexDirection: "column",
  },
  tierCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  popularBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: Spacing.md,
  },
  tierName: {
    marginBottom: Spacing.xs,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  featuresList: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  restoreButton: {
    marginBottom: Spacing.xl,
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: Spacing.md,
  },
  legalText: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  enterpriseContact: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
});
