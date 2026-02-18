import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users as usersSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Extended Express Request with user entitlement info
 */
export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEntitlement?: "none" | "solo" | "professional" | "enterprise";
}

/**
 * Middleware to fetch and attach user entitlement to request
 * Should be used after authentication middleware
 */
export async function attachUserEntitlement(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId || (req as any).user?.id;

    if (!userId) {
      // User not authenticated, skip attaching entitlement
      return next();
    }

    // Fetch user's subscription status from database
    const userRecord = await db
      .select({
        id: usersSchema.id,
        subscriptionStatus: usersSchema.subscriptionStatus,
      })
      .from(usersSchema)
      .where(eq(usersSchema.id, userId))
      .limit(1);

    if (userRecord && userRecord.length > 0) {
      // Map subscription status to entitlement tier
      const subscriptionStatus = userRecord[0].subscriptionStatus || "none";
      req.userEntitlement = mapSubscriptionToEntitlement(subscriptionStatus);
    } else {
      req.userEntitlement = "none";
    }

    next();
  } catch (error) {
    console.error("[Entitlements] Error fetching user entitlement:", error);
    // Continue without entitlement info (will default to free tier)
    req.userEntitlement = "none";
    next();
  }
}

/**
 * Middleware factory to require specific entitlement tier
 * @param requiredTier - Minimum tier required ("solo", "professional", "enterprise")
 */
export function requireEntitlement(
  requiredTier: "solo" | "professional" | "enterprise"
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userTier = req.userEntitlement || "none";

    // Check if user has required tier
    if (!hasEntitlement(userTier, requiredTier)) {
      const tierNames = {
        solo: "Solo",
        professional: "Professional",
        enterprise: "Enterprise",
      };

      return res.status(403).json({
        success: false,
        error: `This feature requires ${tierNames[requiredTier]} plan or higher`,
        requiredTier,
        currentTier: userTier,
      });
    }

    next();
  };
}

/**
 * Helper: Check if user's tier meets or exceeds required tier
 */
function hasEntitlement(userTier: string, requiredTier: string): boolean {
  const tierLevels: Record<string, number> = {
    none: 0,
    solo: 1,
    professional: 2,
    enterprise: 3,
  };

  const userLevel = tierLevels[userTier] || 0;
  const requiredLevel = tierLevels[requiredTier] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Map subscription status from RevenueCat to our entitlement tier
 */
function mapSubscriptionToEntitlement(
  subscriptionStatus: string
): "none" | "solo" | "professional" | "enterprise" {
  // This would be populated by the webhook that updates subscription status
  // For now, we assume the subscription status column contains the tier name
  if (["solo", "professional", "enterprise"].includes(subscriptionStatus)) {
    return subscriptionStatus as "solo" | "professional" | "enterprise";
  }

  return "none";
}

/**
 * Middleware to check and enforce free tier limits
 * @param resource - "voice_recordings" or "invoices"
 * @param limit - Max count for free tier
 */
export function checkFreeTierLimit(
  resource: "voice_recordings" | "invoices",
  limit: number
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Free tier users only
      if ((req.userEntitlement || "none") !== "none") {
        // Paid users don't have limits
        return next();
      }

      const userId = req.userId || (req as any).user?.id;
      const schema = resource === "voice_recordings" ? require("@shared/schema").voiceRecordings : require("@shared/schema").invoices;

      // Count existing resources for this user
      const result = await db.execute(
        `SELECT COUNT(*) as count FROM ${schema === "voice_recordings" ? "voice_recordings" : "invoices"} WHERE user_id = ?`,
        [userId]
      );

      const count = parseInt(result[0]?.count || "0", 10);

      if (count >= limit) {
        return res.status(403).json({
          success: false,
          error: `Free tier limit reached for ${resource}. You can have up to ${limit} ${resource}.`,
          currentCount: count,
          limit,
          solution: `Upgrade to Solo plan to get unlimited ${resource}`,
        });
      }

      next();
    } catch (error) {
      console.error("[FreeTierLimit] Error checking limit:", error);
      // Continue on error (fail open)
      next();
    }
  };
}

/**
 * Endpoint access control configuration
 * Maps endpoints to required entitlements
 */
export const ENDPOINT_ENTITLEMENTS: Record<
  string,
  "none" | "solo" | "professional" | "enterprise"
> = {
  // Voice recordings
  "POST /api/voice-recordings": "none", // Free tier limited to 3
  "DELETE /api/voice-recordings/:id": "none",

  // Invoices
  "POST /api/invoices": "none", // Free tier limited to 3
  "GET /api/invoices": "none",
  "PUT /api/invoices/:id": "none",
  "DELETE /api/invoices/:id": "none",

  // Approvals / Scope Proof (Professional+)
  "POST /api/scope-proofs": "professional",
  "GET /api/scope-proofs": "professional",
  "PUT /api/scope-proofs/:id": "professional",
  "DELETE /api/scope-proofs/:id": "professional",
  "POST /api/approvals/request": "professional",
  "PUT /api/approvals/:id": "professional",

  // Money Alerts (Professional+)
  "POST /api/money-alerts": "professional",
  "GET /api/money-alerts": "professional",

  // Receipts (Solo+)
  "POST /api/receipts": "solo",
  "GET /api/receipts": "solo",

  // Material Costs (Solo+)
  "POST /api/material-costs": "solo",
  "GET /api/material-costs": "solo",

  // Team Members (Enterprise only)
  "POST /api/team-members": "enterprise",
  "GET /api/team-members": "enterprise",
  "DELETE /api/team-members/:id": "enterprise",

  // API Access (Enterprise only)
  "POST /api/api-keys": "enterprise",
  "GET /api/api-keys": "enterprise",
};
