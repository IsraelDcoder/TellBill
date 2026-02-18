import { useSubscriptionStore, Entitlement } from "@/stores/subscriptionStore";

/**
 * Feature access requirements mapping
 * Maps features to the minimum entitlement required
 */
const FEATURE_REQUIREMENTS: Record<string, Entitlement> = {
  // Voice recording and invoicing limits vary by plan
  voiceRecordings: "solo",        // Solo+ has unlimited
  invoices: "solo",               // Solo+ has unlimited
  voiceRecordingsFree: "none",    // Free tier gets 3
  invoicesFree: "none",           // Free tier gets 3

  // Premium features
  scopeProof: "professional",     // Professional+ can use approvals
  approvals: "professional",      // Professional+ can use client approvals
  moneyAlerts: "professional",    // Professional+ can track unbilled work
  receiptScanning: "solo",        // Solo+ can scan receipts
  materialCosts: "solo",          // Solo+ can track material costs
  advancedAnalytics: "professional", // Professional+ has analytics
  customBranding: "enterprise",   // Enterprise only
  teamMembers: "enterprise",      // Enterprise only
  apiAccess: "enterprise",        // Enterprise only
};

interface FeatureAccess {
  hasAccess: boolean;
  currentPlan: Entitlement | "none";
  requiredPlan: Entitlement | "free";
  message?: string;
}

/**
 * Hook to check if user has access to a feature
 * @param feature - Feature identifier
 * @returns Object with hasAccess, currentPlan, requiredPlan
 */
export function useFeatureAccess(feature: keyof typeof FEATURE_REQUIREMENTS): FeatureAccess {
  const { userEntitlement } = useSubscriptionStore();
  
  const requiredPlan = FEATURE_REQUIREMENTS[feature] || "none";
  
  // Map entitlements to numeric levels for comparison
  const entitlementLevels: Record<string, number> = {
    none: 0,      // Free
    solo: 1,      // $12/month
    professional: 2, // $29/month
    enterprise: 3, // $99/month
  };
  
  const currentLevel = entitlementLevels[userEntitlement || "none"] || 0;
  const requiredLevel = entitlementLevels[requiredPlan] || 0;
  const hasAccess = currentLevel >= requiredLevel;
  
  let message = "";
  if (!hasAccess) {
    const planNames: Record<string, string> = {
      none: "Free",
      solo: "Solo",
      professional: "Professional",
      enterprise: "Enterprise",
    };
    
    message = `This feature requires ${planNames[requiredPlan]} plan or higher. You're currently on ${planNames[userEntitlement || "none"] || "Free"} plan.`;
  }
  
  return {
    hasAccess,
    currentPlan: userEntitlement || "none",
    requiredPlan: (requiredPlan as any) || "free",
    message,
  };
}

/**
 * Hook to check if user has reached usage limits on free tier
 * @param type - "voice" or "invoice"
 * @param used - Number of items already used
 * @returns Object with hasReachedLimit and remaining
 */
export function useFreeTierLimit(
  type: "voice" | "invoice",
  used: number
): { hasReachedLimit: boolean; remaining: number; limit: number } {
  const { userEntitlement } = useSubscriptionStore();
  
  // Free tier limits
  const FREE_VOICE_LIMIT = 3;
  const FREE_INVOICE_LIMIT = 3;
  
  const limit = type === "voice" ? FREE_VOICE_LIMIT : FREE_INVOICE_LIMIT;
  const isFree = !userEntitlement || userEntitlement === "none";
  const hasReachedLimit = isFree && used >= limit;
  const remaining = isFree ? Math.max(0, limit - used) : Infinity;
  
  return {
    hasReachedLimit,
    remaining,
    limit: isFree ? limit : Infinity,
  };
}

/**
 * Hook to check if a specific plan feature is available
 * More granular than useFeatureAccess
 */
export function useHasEntitlement(requiredTier: "solo" | "professional" | "enterprise"): boolean {
  const { userEntitlement } = useSubscriptionStore();
  
  if (!userEntitlement || userEntitlement === "none") {
    return false;
  }
  
  const tiers: Record<string, number> = {
    solo: 1,
    professional: 2,
    enterprise: 3,
  };
  
  const currentTier = tiers[userEntitlement] || 0;
  const requiredTierLevel = tiers[requiredTier] || 0;
  
  return currentTier >= requiredTierLevel;
}
