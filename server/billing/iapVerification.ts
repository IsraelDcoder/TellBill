/**
 * IAP Verification & Subscription Backend
 * 
 * Handles verification of iOS/Android subscriptions via RevenueCat
 * Stores subscription metadata in database
 * 
 * Flow:
 * 1. Mobile app completes purchase via RevenueCat SDK
 * 2. App sends receipt/token to POST /api/billing/verify-iap
 * 3. Backend verifies via RevenueCat API
 * 4. Backend stores subscription in DB
 * 5. Returns entitlement status to app
 */

import { Router, Request, Response, Express } from "express";
import axios from "axios";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger";
import { authMiddleware } from "../utils/authMiddleware";

// ============================================
// TYPES
// ============================================

interface IAPVerificationRequest {
  platform: "ios" | "android";
  productId: string;
  receiptOrToken: string; // iOS: receipt, Android: purchaseToken
  revenuecatCustomerId?: string;
}

interface IAPVerificationResponse {
  success: boolean;
  plan?: string;
  status?: string;
  expiresAt?: string;
  message?: string;
}

// ============================================
// REVENUECAT API INTEGRATION
// ============================================

const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY || "";
const REVENUECAT_API_URL = "https://api.revenuecat.com/v1";

/**
 * Verify purchase via RevenueCat
 */
async function verifyPurchaseWithRevenueCat(
  customerId: string
): Promise<{
  plan: string;
  status: string;
  expiresAt: string;
  transactionId: string;
}> {
  try {
    const response = await axios.get(
      `${REVENUECAT_API_URL}/subscribers/${customerId}`,
      {
        headers: {
          "X-RevenueCat-Token": REVENUECAT_API_KEY,
        },
      }
    );

    const { subscriber } = response.data;
    const entitlements = subscriber.entitlements;

    // Check which entitlement is active
    let activePlan = "free";
    let activeEntitlement: any = null;

    for (const [key, entitlement] of Object.entries(entitlements)) {
      if ((entitlement as any).expires_date === null) {
        // Active entitlement (no expiry)
        activeEntitlement = entitlement;
        activePlan = key; // SOLO, PROFESSIONAL, ENTERPRISE
        break;
      } else {
        // Check if currently active but expiring
        const expiresAt = new Date((entitlement as any).expires_date);
        if (expiresAt > new Date()) {
          activeEntitlement = entitlement;
          activePlan = key;
          break;
        }
      }
    }

    if (!activeEntitlement) {
      return {
        plan: "free",
        status: "inactive",
        expiresAt: new Date().toISOString(),
        transactionId: "",
      };
    }

    return {
      plan: activePlan.toLowerCase(),
      status: "active",
      expiresAt: (activeEntitlement as any).expires_date || new Date().toISOString(),
      transactionId: (activeEntitlement as any).purchase_date || "",
    };
  } catch (error) {
    logger.error(
      { error, customerId },
      "Failed to verify purchase with RevenueCat"
    );
    throw error;
  }
}

/**
 * Map RevenueCat entitlement to user plan
 */
function mapEntitlementToPlan(
  entitlementKey: string
): "free" | "solo" | "professional" | "enterprise" {
  const mapping: Record<string, any> = {
    SOLO: "solo",
    PROFESSIONAL: "professional",
    ENTERPRISE: "enterprise",
  };
  return mapping[entitlementKey] || "free";
}

// ============================================
// PUBLIC ENDPOINTS
// ============================================

export function registerBillingRoutes(app: Express) {
  const router = Router();

  /**
   * POST /api/billing/verify-iap
   * Verify IAP purchase and update subscription
   */
  router.post(
    "/verify-iap",
    authMiddleware,
    async (req: Request, res: Response) => {
      const userId = (req as any).user.userId;
      const { platform, productId, receiptOrToken, revenuecatCustomerId } =
        req.body as IAPVerificationRequest;

      if (!platform || !productId || !receiptOrToken) {
        return res.status(400).json({
          success: false,
          message: "Missing platform, productId, or receipt/token",
        });
      }

      try {
        logger.info(
          { userId, platform, productId },
          "IAP verification request"
        );

        // Use provided RevenueCat customer ID or derive from user ID
        const customerId = revenuecatCustomerId || userId;

        // Verify purchase with RevenueCat
        const verification = await verifyPurchaseWithRevenueCat(customerId);

        logger.info(
          { userId, plan: verification.plan, status: verification.status },
          "Purchase verified with RevenueCat"
        );

        // Update user subscription in database
        await db
          .update(users)
          .set({
            currentPlan: verification.plan,
            subscriptionStatus: verification.status,
            subscriptionTier: verification.plan,
            subscriptionUpdatedAt: new Date(),
            subscriptionExpiryDate: new Date(verification.expiresAt),
            stripeCustomerId: customerId, // Store RevenueCat customer ID here for tracking
          })
          .where(eq(users.id, userId));

        logger.info(
          { userId, plan: verification.plan },
          "User subscription updated in database"
        );

        return res.status(200).json({
          success: true,
          plan: verification.plan,
          status: verification.status,
          expiresAt: verification.expiresAt,
          message: `Subscription verified: ${verification.plan}`,
        } as IAPVerificationResponse);
      } catch (error) {
        logger.error({ error, userId }, "IAP verification failed");
        return res.status(500).json({
          success: false,
          message: "Failed to verify purchase",
        });
      }
    }
  );

  /**
   * GET /api/billing/subscription
   * Get current user subscription status
   */
  router.get(
    "/subscription",
    authMiddleware,
    async (req: Request, res: Response) => {
      const userId = (req as any).user.userId;

      try {
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        return res.status(200).json({
          success: true,
          plan: user.currentPlan,
          status: user.subscriptionStatus,
          expiresAt: user.subscriptionExpiryDate,
          tier: user.subscriptionTier,
        });
      } catch (error) {
        logger.error({ error, userId }, "Failed to fetch subscription");
        return res.status(500).json({
          success: false,
          message: "Failed to fetch subscription",
        });
      }
    }
  );

  /**
   * POST /api/billing/restore-purchases
   * Restore purchases from RevenueCat customer info
   */
  router.post(
    "/restore-purchases",
    authMiddleware,
    async (req: Request, res: Response) => {
      const userId = (req as any).user.userId;
      const { revenuecatCustomerInfo } = req.body;

      if (!revenuecatCustomerInfo) {
        return res.status(400).json({
          success: false,
          message: "Missing RevenueCat customer info",
        });
      }

      try {
        logger.info({ userId }, "Restore purchases request");

        // Extract entitlements from customer info
        const entitlements = revenuecatCustomerInfo.entitlements || {};
        let activePlan = "free";
        let expiresAt = new Date();

        for (const [key, entitlement] of Object.entries(entitlements)) {
          const ent = entitlement as any;
          if (ent.expires_date === null || new Date(ent.expires_date) > new Date()) {
            activePlan = mapEntitlementToPlan(key);
            if (ent.expires_date) {
              expiresAt = new Date(ent.expires_date);
            }
            break;
          }
        }

        // Update user
        await db
          .update(users)
          .set({
            currentPlan: activePlan,
            subscriptionStatus: activePlan === "free" ? "inactive" : "active",
            subscriptionTier: activePlan,
            subscriptionUpdatedAt: new Date(),
            subscriptionExpiryDate: expiresAt,
          })
          .where(eq(users.id, userId));

        logger.info({ userId, plan: activePlan }, "Purchases restored");

        return res.status(200).json({
          success: true,
          plan: activePlan,
          status: activePlan === "free" ? "inactive" : "active",
          expiresAt: expiresAt.toISOString(),
        });
      } catch (error) {
        logger.error({ error, userId }, "Restore purchases failed");
        return res.status(500).json({
          success: false,
          message: "Failed to restore purchases",
        });
      }
    }
  );

  app.use("/api/billing", router);
}
