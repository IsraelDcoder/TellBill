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
import { users, invoices, activityLog, projects } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface SubscriptionInfo {
  userId: string;
  plan: "free" | "solo" | "professional";
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
  console.log(`[SubMiddle-START] About to process middleware`);
  console.log(`[SubMiddle-START] req.user value:`, req.user);
  
  try {
    console.log(`[Subscription Middleware] Processing ${req.method} ${req.path}`);
    console.log(`[Subscription Middleware] req.user:`, req.user);
    
    const userId = req.user?.userId || req.user?.id;
    
    console.log(`[Subscription Middleware] Extracted userId: ${userId}`);

    if (!userId) {
      console.log(`[Subscription Middleware] ❌ No user ID found`);
      return res.status(401).json({ error: "Unauthorized - no user ID" });
    }

    // Fetch user with subscription info
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord || userRecord.length === 0) {
      console.log(`[Subscription Middleware] ❌ User not found in database`);
      return res.status(401).json({ error: "User not found" });
    }

    const user = userRecord[0];

    // ✅ Count actual lifetime usage (not just this month)
    // This ensures invoice limits work correctly regardless of month
    
    // Count ALL invoices created by this user (lifetime)
    const invoiceCountResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(invoices)
      .where(eq(invoices.userId, userId));
    const invoiceCount = invoiceCountResult[0]?.count || 0;
    console.log(`[Subscription Middleware] Invoice count for userId ${userId}:`, invoiceCount);

    // Count ALL projects created by this user (lifetime)
    const projectCountResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(projects)
      .where(eq(projects.userId, userId));
    const projectCount = projectCountResult[0]?.count || 0;
    console.log(`[Subscription Middleware] Project count for userId ${userId}:`, projectCount);

    // Voice recordings count from activity log (not implemented yet, using 0)
    const voiceRecordingCount = 0;

    // Attach subscription info with real data
    req.subscription = {
      userId: user.id,
      plan: (user.currentPlan || "free") as "free" | "solo" | "professional",
      status: (user.subscriptionStatus || "inactive") as "active" | "inactive" | "canceled" | "expired",
      subscriptionId: user.revenuecatAppUserId, // RevenueCat customer ID
      currentPeriodEnd: user.subscriptionRenewalDate || user.subscriptionExpiryDate, // Real renewal date
      usageThisMonth: {
        voiceRecordings: voiceRecordingCount,
        invoices: invoiceCount,
        projects: projectCount,
      },
    } as SubscriptionInfo;

    console.log(`[Subscription Middleware] ✅ Attached subscription for userId: ${userId}, plan: ${req.subscription.plan}`);
    console.log(`[Subscription Middleware] Usage this month:`, req.subscription.usageThisMonth);
    console.log(`[Subscription Middleware] Subscription ID:`, req.subscription.subscriptionId);
    console.log(`[Subscription Middleware] Current Period End:`, req.subscription.currentPeriodEnd);
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
      const planHierarchy = ["free", "solo", "professional"];
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
      plan: (user.currentPlan || "free") as "free" | "solo" | "professional",
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
