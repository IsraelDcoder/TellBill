import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSubscriptionStore } from "@/stores/subscriptionStore";

export const SUBSCRIPTION_TIERS = {
  FREE: "free",
  SOLO: "solo",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
};

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];

interface FeatureAccess {
  hasAccess: boolean;
  tier: SubscriptionTier;
  requiresUpgrade: boolean;
  nextTier: SubscriptionTier | null;
}

export function useFeatureAccess(feature: string): FeatureAccess {
  const { user } = useAuth();
  const { currentPlan } = useSubscriptionStore();

  // Get subscription tier from store - default to "free"
  const tier = (currentPlan || SUBSCRIPTION_TIERS.FREE) as SubscriptionTier;

  // Feature matrix
  const featureMatrix: Record<string, SubscriptionTier[]> = {
    receipt_scanner: [SUBSCRIPTION_TIERS.SOLO, SUBSCRIPTION_TIERS.PROFESSIONAL, SUBSCRIPTION_TIERS.ENTERPRISE],
    advanced_reports: [SUBSCRIPTION_TIERS.PROFESSIONAL, SUBSCRIPTION_TIERS.ENTERPRISE],
    team_management: [SUBSCRIPTION_TIERS.PROFESSIONAL, SUBSCRIPTION_TIERS.ENTERPRISE],
    api_access: [SUBSCRIPTION_TIERS.ENTERPRISE],
    priority_support: [SUBSCRIPTION_TIERS.PROFESSIONAL, SUBSCRIPTION_TIERS.ENTERPRISE],
  };

  return useMemo(() => {
    const allowedTiers = featureMatrix[feature] || [];
    const hasAccess = allowedTiers.includes(tier);
    const requiresUpgrade = !hasAccess;

    // Determine next tier needed
    let nextTier: SubscriptionTier | null = null;
    if (requiresUpgrade) {
      // Suggest PROFESSIONAL if free/solo, ENTERPRISE if already on PROFESSIONAL
      nextTier =
        tier === SUBSCRIPTION_TIERS.FREE || tier === SUBSCRIPTION_TIERS.SOLO ? SUBSCRIPTION_TIERS.PROFESSIONAL : SUBSCRIPTION_TIERS.ENTERPRISE;
    }

    return {
      hasAccess,
      tier,
      requiresUpgrade,
      nextTier,
    };
  }, [tier, feature]);
}

export function useReceiptScannerAccess(): FeatureAccess {
  return useFeatureAccess("receipt_scanner");
}

// Check if current user can use receipt scanner
export function canUseReceiptScanner(subscriptionTier: SubscriptionTier): boolean {
  const allowedTiers = [SUBSCRIPTION_TIERS.SOLO, SUBSCRIPTION_TIERS.PROFESSIONAL, SUBSCRIPTION_TIERS.ENTERPRISE];
  return allowedTiers.includes(subscriptionTier);
}
