import { useSubscriptionStore, PLAN_LIMITS, type Plan } from "@/stores/subscriptionStore";

export type FeatureName = "voice_recording" | "invoice_generation" | "team_management" | "project_management";

/**
 * Gatekeeper logic for feature access control
 * 
 * Rules:
 * - Free plan: Limited to 3 total uses (voice + invoice combined)
 * - Solo plan: Unlimited voice/invoice, receipt scanning, payment tracking
 * - Professional plan: Everything in Solo + Scope Proof, Client Approval, Photo Proof
 * - Enterprise: All features available with advanced analytics and API access
 */

export interface AccessCheckResult {
  hasAccess: boolean;
  reason?: string;
  usageInfo?: {
    current: number;
    limit: number;
    remaining: number;
  };
}

/**
 * Check if user has access to a specific feature
 * @param featureName The feature to check access for
 * @param currentPlan The user's current plan
 * @param voiceRecordingsUsed The user's voice recordings used
 * @param invoicesCreated The user's invoices created
 * @returns AccessCheckResult with access status and reason if denied
 */
export function checkAccess(
  featureName: FeatureName,
  currentPlan: Plan,
  voiceRecordingsUsed: number,
  invoicesCreated: number
): AccessCheckResult {
  // Team/Project management - requires Professional or Enterprise
  if (featureName === "team_management" || featureName === "project_management") {
    if (currentPlan === "free" || currentPlan === "solo") {
      return {
        hasAccess: false,
        reason: `${featureName === "team_management" ? "Team management" : "Project management"} is available on Professional & Enterprise plans.`,
      };
    }
    return { hasAccess: true };
  }

  // Voice recording and invoice generation - check usage limits for free plan
  if (featureName === "voice_recording" || featureName === "invoice_generation") {
    if (currentPlan === "free") {
      const limit = PLAN_LIMITS.free.usageLimit;
      const totalUsage = voiceRecordingsUsed + invoicesCreated;
      const remaining = limit - totalUsage;

      if (totalUsage >= limit) {
        return {
          hasAccess: false,
          reason: "free_limit_reached",
          usageInfo: {
            current: totalUsage,
            limit,
            remaining: 0,
          },
        };
      }

      return {
        hasAccess: true,
        usageInfo: {
          current: totalUsage,
          limit,
          remaining,
        },
      };
    }

    // Solo, Team, Enterprise - unlimited
    return {
      hasAccess: true,
      usageInfo: {
        current: 0,
        limit: Infinity,
        remaining: Infinity,
      },
    };
  }

  return { hasAccess: true };
}


/**
 * Hook to check access to a feature
 * @param featureName The feature to check access for
 * @returns AccessCheckResult
 */
export function useCheckAccess(featureName: FeatureName): AccessCheckResult {
  const { currentPlan, voiceRecordingsUsed, invoicesCreated } = useSubscriptionStore();
  return checkAccess(featureName, currentPlan, voiceRecordingsUsed, invoicesCreated);
}

/**
 * Hook to check if user has hit their usage limit
 * @returns true if user is on free plan and has reached limit
 */
export function useHasHitLimit(): boolean {
  const { currentPlan, voiceRecordingsUsed, invoicesCreated } = useSubscriptionStore();
  if (currentPlan === "free") {
    const limit = PLAN_LIMITS.free.usageLimit;
    const totalUsage = voiceRecordingsUsed + invoicesCreated;
    return totalUsage >= limit;
  }
  return false;
}

/**
 * Hook to get remaining uses for free plan
 * @returns remaining uses or null if not on free plan
 */
export function useRemainingUses(): number | null {
  const { currentPlan, voiceRecordingsUsed, invoicesCreated } = useSubscriptionStore();
  if (currentPlan === "free") {
    const limit = PLAN_LIMITS.free.usageLimit;
    const totalUsage = voiceRecordingsUsed + invoicesCreated;
    return Math.max(0, limit - totalUsage);
  }
  return null;
}

