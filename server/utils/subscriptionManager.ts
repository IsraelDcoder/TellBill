import { User } from "@shared/schema";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * ✅ SERVER-SIDE SUBSCRIPTION MANAGEMENT
 * Enforces plan limits on the backend (don't trust client)
 */

export type PlanType = "free" | "solo" | "professional" | "enterprise";

/**
 * Plan feature matrix - defines what each plan can do
 */
export const PLAN_FEATURES = {
  free: {
    voiceRecordings: 3,
    invoices: 3,
    projectsCreated: 3,
    teamMembers: 1,
    storage: 1, // GB
    features: {
      voiceRecording: true,
      basicInvoicing: true,
      emailSupport: true,
      advancedTemplates: false,
      teamManagement: false,
      paymentTracking: false,
      recurringInvoices: false,
      invoiceAutomation: false,
      prioritySupport: false,
      customBranding: false,
      multipleProjects: false,
      advancedAnalytics: false,
      apiAccess: false,
    },
  },
  solo: {
    voiceRecordings: Infinity,
    invoices: Infinity,
    projectsCreated: Infinity,
    teamMembers: 1,
    storage: 100, // GB
    features: {
      voiceRecording: true,
      basicInvoicing: true,
      emailSupport: true,
      advancedTemplates: true,
      teamManagement: false,
      paymentTracking: true,
      recurringInvoices: true,
      invoiceAutomation: true,
      prioritySupport: false,
      customBranding: true,
      multipleProjects: true,
      advancedAnalytics: true,
      apiAccess: false,
    },
  },
  professional: {
    voiceRecordings: Infinity,
    invoices: Infinity,
    projectsCreated: Infinity,
    teamMembers: 1,
    storage: 500, // GB
    features: {
      voiceRecording: true,
      basicInvoicing: true,
      emailSupport: true,
      advancedTemplates: true,
      teamManagement: false,
      paymentTracking: true,
      recurringInvoices: true,
      invoiceAutomation: true,
      prioritySupport: false,
      customBranding: true,
      multipleProjects: true,
      advancedAnalytics: true,
      apiAccess: false,
      scopeProof: true,
      clientApprovals: true,
      photoProof: true,
      approvalReminders: true,
    },
  },
  enterprise: {
    voiceRecordings: Infinity,
    invoices: Infinity,
    projectsCreated: Infinity,
    teamMembers: Infinity,
    storage: Infinity, // GB
    features: {
      voiceRecording: true,
      basicInvoicing: true,
      emailSupport: true,
      advancedTemplates: true,
      teamManagement: true,
      paymentTracking: true,
      recurringInvoices: true,
      invoiceAutomation: true,
      prioritySupport: true,
      customBranding: true,
      multipleProjects: true,
      advancedAnalytics: true,
      apiAccess: true,
    },
  },
};

/**
 * Plan prices in cents (for reference)
 */
export const PLAN_PRICES = {
  solo: 2999, // $29.99
  professional: 7999, // $79.99
  enterprise: 29999, // $299.99
};

/**
 * Subscription status enum
 */
export type SubscriptionStatus = "active" | "inactive" | "cancelled" | "expired";

export interface SubscriptionCheckResult {
  isValid: boolean;
  plan: PlanType;
  status: SubscriptionStatus;
  isActive: boolean;
  hasFeature: (feature: string) => boolean;
  getLimit: (limitType: string) => number;
  error?: string;
}

/**
 * Get user subscription info
 */
export async function getUserSubscription(
  userId: string
): Promise<SubscriptionCheckResult> {
  try {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      return {
        isValid: false,
        plan: "free",
        status: "inactive",
        isActive: false,
        hasFeature: () => false,
        getLimit: () => 0,
        error: "User not found",
      };
    }

    const user = userResult[0];
    const plan = (user.currentPlan || "free") as PlanType;
    const status = (user.subscriptionStatus || "inactive") as SubscriptionStatus;
    const isActive =
      status === "active" && user.isSubscribed === true && plan !== "free";

    return {
      isValid: true,
      plan,
      status,
      isActive,
      hasFeature: (featureName: string) => {
        const planFeatures = PLAN_FEATURES[plan]?.features || {};
        return (planFeatures as Record<string, boolean>)[featureName] || false;
      },
      getLimit: (limitType: string) => {
        const planLimits = PLAN_FEATURES[plan];
        return (planLimits as Record<string, any>)[limitType] || 0;
      },
    };
  } catch (error) {
    console.error("[Subscription] Error fetching user subscription:", error);
    return {
      isValid: false,
      plan: "free",
      status: "inactive",
      isActive: false,
      hasFeature: () => false,
      getLimit: () => 0,
      error: "Database error",
    };
  }
}

/**
 * Verify feature access (check if user can use a feature)
 */
export async function verifyFeatureAccess(
  userId: string,
  featureName: string
): Promise<{ allowed: boolean; error?: string }> {
  const subscription = await getUserSubscription(userId);

  if (!subscription.isValid) {
    return { allowed: false, error: "Invalid user" };
  }

  if (!subscription.hasFeature(featureName)) {
    return {
      allowed: false,
      error: `Feature "${featureName}" not available on ${subscription.plan} plan`,
    };
  }

  return { allowed: true };
}

/**
 * Verify plan limit (check if user has remaining quota)
 */
export async function verifyPlanLimit(
  userId: string,
  limitType: string,
  currentUsage: number
): Promise<{ allowed: boolean; remaining?: number; error?: string }> {
  const subscription = await getUserSubscription(userId);

  if (!subscription.isValid) {
    return { allowed: false, error: "Invalid user" };
  }

  const limit = subscription.getLimit(limitType);

  // Infinity means unlimited
  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity };
  }

  // Check if user has exceeded limit
  if (currentUsage >= limit) {
    return {
      allowed: false,
      remaining: 0,
      error: `${limitType} limit (${limit}) reached on ${subscription.plan} plan`,
    };
  }

  return { allowed: true, remaining: limit - currentUsage };
}

/**
 * Upgrade user subscription
 */
export async function upgradeSubscription(
  userId: string,
  newPlan: PlanType,
  status: SubscriptionStatus = "active"
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!["free", "solo", "professional", "enterprise"].includes(newPlan)) {
      return { success: false, error: "Invalid plan" };
    }

    await db
      .update(users)
      .set({
        currentPlan: newPlan,
        subscriptionStatus: status,
        isSubscribed: status === "active" && newPlan !== "free",
      })
      .where(eq(users.id, userId));

    console.log(`[Subscription] User ${userId} upgraded to ${newPlan}`);
    return { success: true };
  } catch (error) {
    console.error("[Subscription] Upgrade error:", error);
    return { success: false, error: "Failed to upgrade subscription" };
  }
}

/**
 * Downgrade user subscription
 */
export async function downgradeSubscription(
  userId: string,
  newPlan: PlanType = "free"
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(users)
      .set({
        currentPlan: newPlan,
        subscriptionStatus: newPlan === "free" ? "inactive" : "active",
        isSubscribed: false,
      })
      .where(eq(users.id, userId));

    console.log(`[Subscription] User ${userId} downgraded to ${newPlan}`);
    return { success: true };
  } catch (error) {
    console.error("[Subscription] Downgrade error:", error);
    return { success: false, error: "Failed to downgrade subscription" };
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(users)
      .set({
        subscriptionStatus: "cancelled",
        isSubscribed: false,
      })
      .where(eq(users.id, userId));

    console.log(`[Subscription] User ${userId} cancelled subscription`);
    return { success: true };
  } catch (error) {
    console.error("[Subscription] Cancellation error:", error);
    return { success: false, error: "Failed to cancel subscription" };
  }
}

/**
 * Check if subscription is active (for paying customers)
 */
export async function isSubscriptionActive(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return subscription.isActive;
}

/**
 * Check if user is free tier
 */
export async function isFreeTier(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return subscription.plan === "free";
}

/**
 * Get user's current plan
 */
export async function getUserPlan(userId: string): Promise<PlanType> {
  const subscription = await getUserSubscription(userId);
  return subscription.plan;
}
