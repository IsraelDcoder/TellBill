import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Purchases, { PurchasesPackage, CustomerInfo } from "react-native-purchases";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { Confetti } from "@/components/Confetti";
import { LimitReachedModal } from "@/components/LimitReachedModal";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { useSubscriptionStore, Entitlement, PricingTier } from "@/stores/subscriptionStore";

export default function PricingScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const {
    pricingTiers,
    setUserEntitlement,
    setCurrentPlan,
    setIsSubscribed,
    userEntitlement,
    currentPlan,
    showLimitModal,
    setShowLimitModal,
  } = useSubscriptionStore();
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(route?.params?.message || "");
  const [showConfetti, setShowConfetti] = useState(false);
  const [minutesSaved, setMinutesSaved] = useState(0);
  const [packages, setPackages] = useState<Map<string, PurchasesPackage | undefined>>(new Map());

  // Fetch packages from RevenueCat on component mount
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        
        if (offerings.current) {
          const packageMap = new Map<string, PurchasesPackage | undefined>();
          
          // Map tier names to product identifiers
          offerings.current.availablePackages.forEach((pkg) => {
            if (pkg.identifier.includes("solo")) {
              packageMap.set("solo", pkg);
            } else if (pkg.identifier.includes("professional")) {
              packageMap.set("professional", pkg);

            }
          });
          
          setPackages(packageMap);
        }
      } catch (error) {
        console.error("[Pricing] Failed to fetch packages:", error);
      }
    };
    
    fetchPackages();
  }, []);

  // Auto-dismiss confetti after 3 seconds
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false);
        // Navigate back to the origin page after confetti finishes
        if (route?.params?.returnTo) {
          navigation.navigate(route.params.returnTo);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti, route?.params?.returnTo, navigation]);

  const handlePurchase = async (tier: PricingTier) => {
    try {
      if (!user?.id) {
        Alert.alert("Error", "You must be logged in to upgrade your plan");
        return;
      }

      setIsProcessing(true);
      setIsPaymentProcessing(true);
      setSelectedTier(tier.name);

      // Get the package for this tier
      const pkgToPurchase = packages.get(tier.name);
      
      if (!pkgToPurchase) {
        throw new Error(`Package not available for ${tier.name} plan`);
      }

      // Make the purchase through RevenueCat
      try {
        const result = await Purchases.purchasePackage(pkgToPurchase);
        
        // Purchase successful, update entitlements
        const activeEntitlements = Object.keys(result.customerInfo.entitlements.active || {});
        
        if (activeEntitlements.length > 0) {
          // Map entitlements to our tier system
          let entitlement: Entitlement = "none";
          
          if (activeEntitlements.includes("professional")) {
            entitlement = "professional";
          } else if (activeEntitlements.includes("professional")) {
            entitlement = "professional";
          } else if (activeEntitlements.includes("solo")) {
            entitlement = "solo";
          }
          
          setUserEntitlement(entitlement);
          if (entitlement !== "none") {
            setCurrentPlan(entitlement);
            setIsSubscribed(true);
          }
          setShowConfetti(true);
          
          Alert.alert(
            "Success! 🎉",
            `You're now on the ${tier.displayName} plan!`,
            [
              {
                text: "OK",
                onPress: () => {
                  if (route?.params?.returnTo) {
                    navigation.navigate(route.params.returnTo);
                  } else {
                    navigation.goBack();
                  }
                },
              },
            ]
          );
        }
      } catch (purchaseError: any) {
        if (purchaseError.userCancelled) {
          // User cancelled, that's fine
          console.log("[Pricing] User cancelled purchase");
        } else {
          throw purchaseError;
        }
      }
    } catch (error) {
      console.error("[Pricing] Purchase error:", error);
      Alert.alert(
        "Payment Error",
        error instanceof Error ? error.message : "Failed to complete purchase. Please try again."
      );
    } finally {
      setIsProcessing(false);
      setIsPaymentProcessing(false);
      setSelectedTier(null);
    }
  };

  const getYearlyPrice = (monthlyPrice: number) => {
    return Math.floor(monthlyPrice * 12 * 0.8); // 20% discount
  };

  const getSavings = (monthlyPrice: number) => {
    const regular = monthlyPrice * 12;
    const discounted = getYearlyPrice(monthlyPrice);
    return regular - discounted;
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="h1" style={styles.title}>
            Simple, Transparent Pricing
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            Choose the perfect plan for your business
          </ThemedText>
        </View>

        {/* Message if navigating from guard */}
        {message && (
          <View
            style={[
              styles.messageBox,
              { backgroundColor: `${BrandColors.warning}20` },
            ]}
          >
            <Feather name="info" size={16} color={BrandColors.warning} />
            <ThemedText type="small" style={{ color: BrandColors.warning, flex: 1, marginLeft: Spacing.md }}>
              {message}
            </ThemedText>
          </View>
        )}

        {/* Billing Toggle */}
        <View style={styles.billingToggleContainer}>
          <View style={styles.billingToggle}>
            <ThemedText
              type="body"
              style={[
                styles.billingLabel,
                { color: !isAnnual ? theme.text : theme.textSecondary },
              ]}
            >
              Monthly
            </ThemedText>
            <Switch
              value={isAnnual}
              onValueChange={setIsAnnual}
              trackColor={{ false: theme.border, true: BrandColors.constructionGold }}
              thumbColor={isAnnual ? BrandColors.constructionGold : "#f4f3f4"}
            />
            <ThemedText
              type="body"
              style={[
                styles.billingLabel,
                { color: isAnnual ? theme.text : theme.textSecondary },
              ]}
            >
              Yearly
            </ThemedText>
          </View>
          {isAnnual && (
            <ThemedText
              type="small"
              style={[styles.savingsLabel, { color: BrandColors.success }]}
            >
              Save 20%
            </ThemedText>
          )}
        </View>

        {/* Pricing Cards */}
        <View style={styles.cardsContainer}>
          {pricingTiers.map((tier) => {
            const price = isAnnual ? getYearlyPrice(tier.monthlyPrice) : tier.monthlyPrice;
            const displayPrice = isAnnual ? price : tier.monthlyPrice;
            const billingPeriod = isAnnual ? "year" : "month";
            const savings = isAnnual ? getSavings(tier.monthlyPrice) : 0;

            return (
              <Pressable
                key={tier.id}
                style={[
                  styles.card,
                  {
                    borderColor: tier.isPopular ? BrandColors.constructionGold : theme.border,
                    borderWidth: tier.isPopular ? 2 : 1,
                    backgroundColor: tier.isPopular
                      ? isDark
                        ? `${BrandColors.constructionGold}10`
                        : `${BrandColors.constructionGold}05`
                      : theme.backgroundDefault,
                  },
                ]}
              >
                {/* Most Popular Badge */}
                {tier.isPopular && (
                  <View
                    style={[
                      styles.popularBadge,
                      { backgroundColor: BrandColors.constructionGold },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={[styles.popularBadgeText, { color: "#000" }]}
                    >
                      MOST POPULAR
                    </ThemedText>
                  </View>
                )}

                {/* Plan Name */}
                <ThemedText type="h3" style={styles.planName}>
                  {tier.displayName}
                </ThemedText>

                {/* Price */}
                <View style={styles.priceContainer}>
                  <ThemedText type="h1" style={styles.price}>
                    ${displayPrice}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={[styles.billingPeriod, { color: theme.textSecondary }]}
                  >
                    per {billingPeriod}
                  </ThemedText>
                </View>

                {/* Savings */}
                {savings > 0 && (
                  <ThemedText
                    type="small"
                    style={[styles.savingsText, { color: BrandColors.success }]}
                  >
                    Save ${savings}/year
                  </ThemedText>
                )}

                {/* CTA Button */}
                <Button
                  onPress={() => handlePurchase(tier)}
                  disabled={isProcessing || isPaymentProcessing}
                  style={[
                    styles.ctaButton,
                    {
                      backgroundColor: tier.isPopular
                        ? BrandColors.constructionGold
                        : theme.border,
                    },
                  ]}
                >
                  {(isProcessing && selectedTier === tier.name) || isPaymentProcessing ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <ThemedText
                      type="body"
                      style={[
                        styles.ctaButtonText,
                        { color: tier.isPopular ? "#000" : theme.text },
                      ]}
                    >
                      {currentPlan === tier.name ? "Current Plan" : "Upgrade"}
                    </ThemedText>
                  )}
                </Button>

                {/* Divider */}
                <View
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />

                {/* Features */}
                <View style={styles.features}>
                  {tier.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <Feather
                        name="check-circle"
                        size={16}
                        color={BrandColors.constructionGold}
                        style={styles.featureIcon}
                      />
                      <ThemedText
                        type="small"
                        style={[styles.featureText, { color: theme.text }]}
                      >
                        {feature}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* FAQ or Additional Info */}
        <View style={styles.infoSection}>
          <ThemedText type="h4" style={styles.infoTitle}>
            All plans include
          </ThemedText>
          <View style={styles.infoList}>
            {[
              "30-day money-back guarantee",
              "Cancel anytime",
              "Mobile & desktop access",
            ].map((item, idx) => (
              <View key={idx} style={styles.infoItem}>
                <Feather name="check" size={14} color={BrandColors.success} />
                <ThemedText type="small" style={{ marginLeft: Spacing.sm }}>
                  {item}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Confetti animation on successful purchase */}
      <Confetti isVisible={showConfetti} duration={3000} pieceCount={30} />

      {/* Limit reached modal for free users */}
      <LimitReachedModal
        isVisible={showLimitModal}
        minutesSaved={minutesSaved}
        onDismiss={() => setShowLimitModal(false)}
        onUpgrade={() => {
          setShowLimitModal(false);
          // Scroll to Solo tier for upgrade
          setTimeout(() => {
            setIsAnnual(false);
          }, 300);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  subtitle: {
    textAlign: "center",
    maxWidth: 300,
  },
  messageBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  billingToggleContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  billingToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  billingLabel: {
    fontWeight: "600",
  },
  savingsLabel: {
    marginTop: Spacing.sm,
    fontWeight: "600",
  },
  cardsContainer: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    position: "relative",
  },
  popularBadge: {
    position: "absolute",
    top: -12,
    alignSelf: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  popularBadgeText: {
    fontWeight: "700",
    fontSize: 10,
  },
  planName: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  priceContainer: {
    marginBottom: Spacing.sm,
  },
  price: {
    fontWeight: "700",
  },
  billingPeriod: {
    marginTop: 4,
  },
  savingsText: {
    marginBottom: Spacing.md,
    fontWeight: "600",
  },
  ctaButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    minHeight: 48,
    justifyContent: "center",
  },
  ctaButtonText: {
    fontWeight: "600",
    textAlign: "center",
  },
  divider: {
    height: 1,
    marginBottom: Spacing.lg,
  },
  features: {
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  featureIcon: {
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    lineHeight: 20,
  },
  infoSection: {
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  infoTitle: {
    marginBottom: Spacing.md,
  },
  infoList: {
    gap: Spacing.sm,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
});
