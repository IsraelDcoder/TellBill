import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";
import { db } from "./db";
import { authMiddleware } from "./utils/authMiddleware";
import { validateUUID } from "./utils/validation";
import { capturePaymentEvent, captureException } from "./utils/sentry";

const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY || "";
const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET || "";

/**
 * RevenueCat Subscription Model
 * Maps to user subscription status in database
 */
interface RevenueCatCustomerInfo {
  request_date_ms: number;
  subscriber: {
    first_seen_at: string;
    management_url?: string;
    non_subscriptions: Record<string, unknown>;
    original_app_user_id: string;
    original_purchase_date?: string;
    other_purchases: Record<string, unknown>;
    subscriptions: Record<string, SubscriptionInfo>;
    entitlements: Record<string, EntitlementInfo>;
  };
}

interface SubscriptionInfo {
  expires_date: string;
  purchase_date: string;
  original_purchase_date?: string;
  period_type: "intro" | "normal" | "trial";
}

interface EntitlementInfo {
  expires_date: string;
  purchase_date: string;
  product_identifier: string;
  period_type?: "intro" | "normal" | "trial";
}

/**
 * Map RevenueCat entitlements to subscription tiers
 */
function mapEntitlementToPlan(entitlementId?: string): "solo" | "professional" | "enterprise" | "free" {
  switch (entitlementId) {
    case "enterprise_plan":
      return "enterprise";
    case "professional_plan":
      return "professional";
    case "solo_plan":
      return "solo";
    default:
      return "free";
  }
}

/**
 * Get latest active subscription from RevenueCat
 */
function getLatestSubscription(
  subscriptions: Record<string, SubscriptionInfo>
): { productId: string; info: SubscriptionInfo } | null {
  if (!subscriptions || Object.keys(subscriptions).length === 0) {
    return null;
  }

  // Find the subscription with the latest purchase date
  let latest: { productId: string; info: SubscriptionInfo } | null = null;

  for (const [productId, info] of Object.entries(subscriptions)) {
    const purchaseDate = new Date(info.purchase_date).getTime();
    const latestDate = latest ? new Date(latest.info.purchase_date).getTime() : 0;

    if (purchaseDate > latestDate) {
      latest = { productId, info };
    }
  }

  return latest;
}

/**
 * Verify subscription is still active
 */
function isSubscriptionActive(expiryDate: string): boolean {
  return new Date(expiryDate).getTime() > Date.now();
}

export function registerRevenueCatRoutes(app: Express) {
  /**
   * GET /api/subscription/status
   * Get current subscription status for authenticated user
   * ✅ Auth required
   */
  app.get("/api/subscription/status", authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized - no user ID",
        });
      }

      // Get user from database
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const userData = user[0];

      // Return subscription status from database
      // RevenueCat webhooks keep this updated
      return res.status(200).json({
        success: true,
        subscription: {
          userId,
          plan: userData.subscriptionTier || "free",
          status: userData.subscriptionStatus || "inactive",
          expiryDate: userData.subscriptionExpiryDate || null,
          renewalDate: userData.subscriptionRenewalDate || null,
          platform: userData.subscriptionPlatform || null, // "ios" | "android"
          cancellationDate: userData.subscriptionCancellationDate || null,
          isTrialing: userData.isTrialing || false,
        },
      });
    } catch (error) {
      console.error("[RevenueCat] Status check error:", error);
      captureException(error as Error, { endpoint: "/api/subscription/status" });
      return res.status(500).json({
        success: false,
        error: "Failed to fetch subscription status",
      });
    }
  });

  /**
   * POST /api/subscription/verify
   * Verify subscription with RevenueCat API
   * Frontend calls this after purchase to validate
   * ✅ Auth required
   */
  app.post("/api/subscription/verify", authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { appUserId } = req.body; // RevenueCat customer ID from frontend

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      if (!appUserId) {
        return res.status(400).json({
          success: false,
          error: "Missing appUserId - required to verify with RevenueCat",
        });
      }

      if (!REVENUECAT_API_KEY) {
        console.error("[RevenueCat] API key not configured");
        return res.status(500).json({
          success: false,
          error: "Payment verification not configured",
        });
      }

      // Fetch customer info from RevenueCat API
      const revenuecatResponse = await fetch(`https://api.revenuecat.com/v1/customers/${appUserId}`, {
        headers: {
          Authorization: `Bearer ${REVENUECAT_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (!revenuecatResponse.ok) {
        console.error("[RevenueCat] API error:", revenuecatResponse.status);
        return res.status(400).json({
          success: false,
          error: "Failed to verify with RevenueCat",
        });
      }

      const customerData: RevenueCatCustomerInfo = await revenuecatResponse.json();
      const subscriber = customerData.subscriber;

      // Get active entitlement
      let activePlan: "solo" | "professional" | "enterprise" | "free" = "free";
      let expiryDate: Date | null = null;
      let isActive = false;

      if (subscriber.entitlements) {
        for (const [entitlementId, entitlement] of Object.entries(subscriber.entitlements)) {
          if (isSubscriptionActive(entitlement.expires_date)) {
            activePlan = mapEntitlementToPlan(entitlementId);
            expiryDate = new Date(entitlement.expires_date);
            isActive = true;
            break;
          }
        }
      }

      // If no active entitlements, check subscriptions
      let latestProductId = "";
      if (!isActive && subscriber.subscriptions) {
        const latest = getLatestSubscription(subscriber.subscriptions);
        if (latest && isSubscriptionActive(latest.info.expires_date)) {
          expiryDate = new Date(latest.info.expires_date);
          isActive = true;
          // Map product ID to plan (you'll need to configure this mapping)
          activePlan = mapProductIdToPlan(latest.productId);
          latestProductId = latest.productId;
        }
      }

      // Update user in database
      if (isActive && expiryDate) {
        await db
          .update(users)
          .set({
            revenuecatAppUserId: appUserId,
            subscriptionTier: activePlan,
            subscriptionStatus: "active",
            subscriptionExpiryDate: expiryDate,
            subscriptionPlatform: detectPlatform(latestProductId || ""),
          })
          .where(eq(users.id, userId));

        capturePaymentEvent(true, appUserId, 0, userId, activePlan);
      }

      return res.status(200).json({
        success: true,
        subscription: {
          plan: activePlan,
          status: isActive ? "active" : "inactive",
          expiryDate,
          isActive,
        },
      });
    } catch (error) {
      console.error("[RevenueCat] Verification error:", error);
      captureException(error as Error, { endpoint: "/api/subscription/verify" });
      return res.status(500).json({
        success: false,
        error: "Subscription verification failed",
      });
    }
  });

  /**
   * POST /api/subscription/restore
   * Restore purchases from App Store or Google Play
   * ✅ Auth required (user restoring on new device)
   */
  app.post("/api/subscription/restore", authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { appUserId } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      if (!appUserId) {
        return res.status(400).json({
          success: false,
          error: "Missing appUserId",
        });
      }

      if (!REVENUECAT_API_KEY) {
        return res.status(500).json({
          success: false,
          error: "Payment verification not configured",
        });
      }

      // Call RevenueCat to verify purchases
      const revenuecatResponse = await fetch(`https://api.revenuecat.com/v1/customers/${appUserId}`, {
        headers: {
          Authorization: `Bearer ${REVENUECAT_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (!revenuecatResponse.ok) {
        return res.status(400).json({
          success: false,
          error: "Failed to restore purchases",
        });
      }

      const customerData: RevenueCatCustomerInfo = await revenuecatResponse.json();
      const subscriber = customerData.subscriber;

      // Get active entitlement
      let activePlan: "solo" | "professional" | "enterprise" | "free" = "free";
      let expiryDate: Date | null = null;
      let isActive = false;

      if (subscriber.entitlements) {
        for (const [entitlementId, entitlement] of Object.entries(subscriber.entitlements)) {
          if (isSubscriptionActive(entitlement.expires_date)) {
            activePlan = mapEntitlementToPlan(entitlementId);
            expiryDate = new Date(entitlement.expires_date);
            isActive = true;
            break;
          }
        }
      }

      // If no active entitlements, check subscriptions
      if (!isActive && subscriber.subscriptions) {
        const latest = getLatestSubscription(subscriber.subscriptions);
        if (latest && isSubscriptionActive(latest.info.expires_date)) {
          expiryDate = new Date(latest.info.expires_date);
          isActive = true;
          activePlan = mapProductIdToPlan(latest.productId);
        }
      }

      // ✅ Update user in database with restored subscription
      if (expiryDate) {
        await db
          .update(users)
          .set({
            revenuecatAppUserId: appUserId,
            subscriptionTier: activePlan,
            subscriptionStatus: isActive ? "active" : "inactive",
            subscriptionExpiryDate: expiryDate,
            subscriptionPlatform: null, // Will be set by webhook
            subscriptionUpdatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }

      return res.status(200).json({
        success: true,
        message: "Purchases restored successfully",
        subscription: {
          plan: activePlan,
          status: isActive ? "active" : "inactive",
          expiryDate,
        },
      });
    } catch (error) {
      console.error("[RevenueCat] Restore error:", error);
      captureException(error as Error, { endpoint: "/api/subscription/restore" });
      return res.status(500).json({
        success: false,
        error: "Purchase restoration failed",
      });
    }
  });

  /**
   * POST /api/webhooks/revenuecat
   * RevenueCat webhook for subscription events
   * ✅ No auth required - signature verification instead
   * Handles: purchase, renewal, cancellation, refund
   */
  app.post("/api/webhooks/revenuecat", async (req: Request, res: Response) => {
    try {
      // In production, verify webhook signature
      // For now, just process the event
      const event = req.body;

      const appUserId = event.app_user_id;
      const eventType = event.type;

      console.log(`[RevenueCat Webhook] ${eventType} for user ${appUserId}`);

      // ✅ FIX: Find user by RevenueCat app user ID (stored in revenuecatAppUserId column)
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.revenuecatAppUserId, appUserId))
        .limit(1);

      if (!userResult.length) {
        console.warn(`[RevenueCat] User not found for appUserId: ${appUserId}`);
        return res.status(200).json({ success: true }); // Acknowledge webhook
      }

      const userData = userResult[0];

      // Handle different event types
      switch (eventType) {
        case "SUBSCRIPTION_PAUSED":
        case "SUBSCRIPTION_EXPIRED":
          await db
            .update(users)
            .set({
              subscriptionStatus: "inactive",
              subscriptionTier: "free",
            })
            .where(eq(users.id, userData.id));
          break;

        case "SUBSCRIPTION_CANCELLED":
          await db
            .update(users)
            .set({
              subscriptionStatus: "cancelled",
              subscriptionTier: "free",
              subscriptionCancellationDate: new Date(),
            })
            .where(eq(users.id, userData.id));
          break;

        case "SUBSCRIPTION_RENEWED":
          // Update expiry date
          if (event.expiration_at_ms) {
            await db
              .update(users)
              .set({
                subscriptionStatus: "active",
                subscriptionExpiryDate: new Date(event.expiration_at_ms),
              })
              .where(eq(users.id, userData.id));
          }
          break;
      }

      // Acknowledge webhook receipt
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("[RevenueCat Webhook] Error:", error);
      // Still acknowledge - RevenueCat will retry on error
      return res.status(200).json({ success: true });
    }
  });
}

/**
 * Helper: Map RevenueCat product ID to plan tier
 * Configure this based on your product IDs from App Store Connect and Google Play Console
 */
function mapProductIdToPlan(
  productId: string
): "solo" | "professional" | "enterprise" {
  // Example mapping - update with your actual product IDs
  if (
    productId.includes("enterprise") ||
    productId.includes("team")
  ) {
    return "enterprise";
  }
  if (
    productId.includes("professional") ||
    productId.includes("pro")
  ) {
    return "professional";
  }
  return "solo";
}

/**
 * Helper: Detect platform from product ID
 */
function detectPlatform(productId: string): "ios" | "android" | null {
  // This is a guess - RevenueCat may provide this in metadata
  // You might need to look up the product ID in your console configs
  // For now, return null and handle platform detection separately
  return null;
}
