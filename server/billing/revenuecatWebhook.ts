/**
 * RevenueCat Webhook Handler
 * 
 * Processes subscription events from RevenueCat:
 * - INITIAL_PURCHASE
 * - RENEWAL
 * - CANCELLATION
 * - EXPIRATION
 * 
 * Updates user subscription status in database
 */

import { Router, Request, Response, Express } from "express";
import crypto from "crypto";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger";

interface RevenueCatWebhookEvent {
  event: {
    type: string;
    app_user_id: string;
    product_id: string;
    entitlement_id: string;
    entitlements: Record<string, { expires_date: string | null }>;
  };
}

/**
 * Verify RevenueCat webhook signature
 */
function verifyRevenueCatSignature(
  body: string,
  signature: string
): boolean {
  try {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET || "";
    
    // RevenueCat uses SHA256
    const hash = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("base64");

    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(signature)
    );
  } catch (error) {
    logger.error({ error }, "Webhook signature verification failed");
    return false;
  }
}

/**
 * Map entitlement to plan
 */
function getActivePlan(
  entitlements: Record<string, { expires_date: string | null }>
): { plan: string; expiresAt: string } {
  let activePlan = "free";
  let expiresAt = new Date().toISOString();

  for (const [key, ent] of Object.entries(entitlements)) {
    // Check if active (no expiry or future expiry)
    if (ent.expires_date === null || new Date(ent.expires_date) > new Date()) {
      const planMap: Record<string, string> = {
        SOLO: "solo",
        PROFESSIONAL: "professional",

      };
      activePlan = planMap[key] || "free";
      expiresAt = ent.expires_date || new Date().toISOString();
      break;
    }
  }

  return { plan: activePlan, expiresAt };
}

export function registerRevenueCatWebhook(app: Express) {
  const router = Router();

  /**
   * POST /api/webhooks/revenuecat
   * Handle RevenueCat subscription events
   */
  router.post("/revenuecat", async (req: Request, res: Response) => {
    try {
      // Get raw body for signature verification
      let rawBody = (req as any).rawBody || JSON.stringify(req.body);
      if (typeof rawBody !== "string") {
        rawBody = JSON.stringify(rawBody);
      }

      const signature = req.headers["x-revenuecat-signature"] as string;

      // Verify webhook signature
      if (!verifyRevenueCatSignature(rawBody, signature)) {
        logger.warn("Invalid RevenueCat webhook signature");
        return res.status(401).json({ error: "Invalid signature" });
      }

      const event: RevenueCatWebhookEvent = req.body;
      const { type, app_user_id, entitlements } = event.event;

      logger.info(
        { type, userId: app_user_id },
        "RevenueCat webhook received"
      );

      // Find user by RevenueCat customer ID (app_user_id)
      const user = await db.query.users.findFirst({
        where: eq(users.id, app_user_id),
      });

      if (!user) {
        logger.warn(
          { userId: app_user_id },
          "RevenueCat webhook user not found"
        );
        return res.status(404).json({ error: "User not found" });
      }

      const { plan, expiresAt } = getActivePlan(entitlements);

      switch (type) {
        case "INITIAL_PURCHASE":
        case "RENEWAL":
          logger.info(
            { userId: app_user_id, plan },
            "Subscription purchase/renewal"
          );

          await db
            .update(users)
            .set({
              currentPlan: plan,
              subscriptionStatus: plan === "free" ? "inactive" : "active",
              subscriptionTier: plan,
              subscriptionUpdatedAt: new Date(),
              subscriptionExpiryDate: new Date(expiresAt),
            })
            .where(eq(users.id, app_user_id));

          break;

        case "CANCELLATION":
          logger.info({ userId: app_user_id }, "Subscription canceled");

          await db
            .update(users)
            .set({
              currentPlan: "free",
              subscriptionStatus: "canceled",
              subscriptionTier: "free",
              subscriptionUpdatedAt: new Date(),
            })
            .where(eq(users.id, app_user_id));

          break;

        case "EXPIRATION":
          logger.info({ userId: app_user_id }, "Subscription expired");

          await db
            .update(users)
            .set({
              currentPlan: "free",
              subscriptionStatus: "expired",
              subscriptionTier: "free",
              subscriptionUpdatedAt: new Date(),
              subscriptionExpiryDate: new Date(),
            })
            .where(eq(users.id, app_user_id));

          break;

        default:
          logger.info({ type }, "Unhandled RevenueCat event type");
      }

      return res.status(200).json({
        success: true,
        message: `Event ${type} processed`,
      });
    } catch (error) {
      logger.error({ error }, "RevenueCat webhook processing failed");
      return res.status(500).json({
        error: "Webhook processing failed",
      });
    }
  });

  app.use("/api/webhooks", router);
}
