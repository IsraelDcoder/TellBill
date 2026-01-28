/**
 * 🔐 SUBSCRIPTION MIDDLEWARE
 * 
 * Attaches user's subscription info to every authenticated request.
 * This ensures the backend ALWAYS knows the user's plan.
 * 
 * Usage: Apply AFTER authentication middleware
 */

import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface SubscriptionInfo {
  userId: string;
  plan: "free" | "solo" | "professional" | "enterprise";
  status: "active" | "inactive" | "canceled" | "expired";
  subscriptionId?: string;
  currentPeriodEnd?: Date;
  usageThisMonth?: {
    voiceRecordings: number;
    invoices: number;
    projects: number;
  };
}

/**
 * Middleware: Attach subscription to req.subscription
 */
export async function attachSubscriptionMiddleware(
  req: any,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - no user ID" });
    }

    // Fetch user with subscription info
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord || userRecord.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userRecord[0];

    // Attach subscription info
    req.subscription = {
      userId: user.id,
      plan: (user.currentPlan || "free") as "free" | "solo" | "professional" | "enterprise",
      status: (user.subscriptionStatus || "inactive") as "active" | "inactive" | "canceled" | "expired",
      subscriptionId: undefined,
      currentPeriodEnd: undefined,
      usageThisMonth: {
        voiceRecordings: 0,
        invoices: 0,
        projects: 0,
      },
    } as SubscriptionInfo;

    next();
  } catch (error) {
    console.error("[Subscription Middleware] Error:", error);
    return res.status(500).json({ error: "Failed to load subscription" });
  }
}

/**
 * GUARD: Require user to be on a paid plan (not free)
 */
export function requirePaidPlan(req: any, res: Response, next: NextFunction) {
  if (!req.subscription) {
    return res.status(500).json({ error: "Subscription not attached" });
  }

  if (req.subscription.plan === "free") {
    return res.status(403).json({
      error: "Upgrade required",
      code: "NOT_ON_PAID_PLAN",
      required_plan: "solo",
      message: "This feature requires a paid plan",
    });
  }

  next();
}

/**
 * GUARD: Require specific plan or higher
 */
export function requirePlan(...plans: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.subscription) {
      return res.status(500).json({ error: "Subscription not attached" });
    }

    if (!plans.includes(req.subscription.plan)) {
      const planHierarchy = ["free", "solo", "professional", "enterprise"];
      const requiredPlan = plans[0];

      return res.status(403).json({
        error: "Upgrade required",
        code: "INSUFFICIENT_PLAN",
        current_plan: req.subscription.plan,
        required_plan: requiredPlan,
        message: `This feature requires ${requiredPlan} plan or higher`,
      });
    }

    next();
  };
}

/**
 * GUARD: Check usage limit for metered features
 */
export function checkUsageLimit(
  metric: "voiceRecordings" | "invoices" | "projects",
  limits: Record<string, number>
) {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.subscription) {
      return res.status(500).json({ error: "Subscription not attached" });
    }

    const plan = req.subscription.plan;
    const usage = req.subscription.usageThisMonth?.[metric] || 0;
    const limit = limits[plan];

    if (limit !== undefined && usage >= limit) {
      return res.status(403).json({
        error: "Limit reached",
        code: "USAGE_LIMIT_EXCEEDED",
        current_plan: plan,
        metric,
        used: usage,
        limit,
        upgrade_required: plan === "free",
        required_plan: "solo",
      });
    }

    next();
  };
}

/**
 * HELPER: Get subscription info for a user
 */
export async function getUserSubscription(
  userId: string
): Promise<SubscriptionInfo | null> {
  try {
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord || userRecord.length === 0) {
      return null;
    }

    const user = userRecord[0];

    return {
      userId: user.id,
      plan: (user.currentPlan || "free") as "free" | "solo" | "professional" | "enterprise",
      status: (user.subscriptionStatus || "inactive") as "active" | "inactive" | "canceled" | "expired",
      subscriptionId: undefined,
      currentPeriodEnd: undefined,
      usageThisMonth: {
        voiceRecordings: 0,
        invoices: 0,
        projects: 0,
      },
    };
  } catch (error) {
    console.error("[Get Subscription] Error:", error);
    return null;
  }
}
