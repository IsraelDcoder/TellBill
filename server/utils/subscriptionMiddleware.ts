import { Request, Response, NextFunction } from "express";
import {
  getUserSubscription,
  verifyFeatureAccess,
  verifyPlanLimit,
  isFreeTier,
} from "./subscriptionManager";

/**
 * ✅ SUBSCRIPTION VERIFICATION MIDDLEWARE
 * Enforces plan limits and feature access on protected routes
 */

declare global {
  namespace Express {
    interface Request {
      subscription?: {
        plan: string;
        status: string;
        isActive: boolean;
        hasFeature: (feature: string) => boolean;
        getLimit: (limitType: string) => number;
      };
    }
  }
}

/**
 * Attach subscription info to request
 * Non-blocking middleware - adds subscription data but doesn't fail
 */
export async function subscriptionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user || !req.user.userId) {
      return next();
    }

    const subscription = await getUserSubscription(req.user.userId);
    if (subscription.isValid) {
      req.subscription = {
        plan: subscription.plan,
        status: subscription.status,
        isActive: subscription.isActive,
        hasFeature: subscription.hasFeature,
        getLimit: subscription.getLimit,
      };
    }

    next();
  } catch (error) {
    console.error("[Subscription] Middleware error:", error);
    next(); // Continue even if subscription check fails
  }
}

/**
 * Require specific feature to access endpoint
 * Blocks access if user doesn't have the feature
 */
export function requireFeature(featureName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const result = await verifyFeatureAccess(req.user.userId, featureName);

      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          error: "Upgrade required",
          message: result.error,
          upgradeRequired: true,
        });
      }

      next();
    } catch (error) {
      console.error("[Subscription] Feature verification error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };
}

/**
 * Require specific plan tier or higher
 * Usage: requirePlan("solo") - blocks free tier users
 */
export function requirePlan(...allowedPlans: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const subscription = await getUserSubscription(req.user.userId);

      if (!allowedPlans.includes(subscription.plan)) {
        return res.status(403).json({
          success: false,
          error: "Plan upgrade required",
          message: `This feature requires one of these plans: ${allowedPlans.join(", ")}`,
          currentPlan: subscription.plan,
          upgradeRequired: true,
        });
      }

      next();
    } catch (error) {
      console.error("[Subscription] Plan verification error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };
}

/**
 * Require active paid subscription (not free tier)
 */
export function requirePaidPlan() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const isFree = await isFreeTier(req.user.userId);

      if (isFree) {
        return res.status(403).json({
          success: false,
          error: "Upgrade required",
          message: "This feature is only available for paid plans",
          upgradeRequired: true,
        });
      }

      next();
    } catch (error) {
      console.error("[Subscription] Paid plan verification error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };
}

/**
 * Helper for route handlers to check limits
 * Usage in route handler:
 *   const limitCheck = await checkUsageLimit(req, "invoices", currentInvoiceCount);
 *   if (!limitCheck.allowed) return res.status(403).json(limitCheck);
 */
export async function checkUsageLimit(
  req: Request,
  limitType: string,
  currentUsage: number
) {
  try {
    if (!req.user || !req.user.userId) {
      return {
        allowed: false,
        error: "Authentication required",
      };
    }

    const result = await verifyPlanLimit(
      req.user.userId,
      limitType,
      currentUsage
    );

    if (!result.allowed) {
      return {
        allowed: false,
        error: result.error,
        remaining: result.remaining,
        upgradeRequired: true,
      };
    }

    return {
      allowed: true,
      remaining: result.remaining,
    };
  } catch (error) {
    console.error("[Subscription] Usage limit check error:", error);
    return {
      allowed: false,
      error: "Internal server error",
    };
  }
}
