import type { Express, Request, Response } from "express";
import { stripe } from "./stripeClient";
import { STRIPE_PLANS, validatePlanTier, getPlanByPriceId } from "./stripePlans";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../utils/authMiddleware";
import { logger } from "../utils/logger";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export function registerStripeRoutes(app: Express) {
  /**
   * POST /api/payments/stripe/checkout
   * Create a Stripe Checkout Session for subscription
   *
   * Required:
   * - JWT auth
   * - plan: "solo" | "professional" | "enterprise"
   *
   * Returns:
   * - checkoutUrl: URL to redirect user to Stripe Checkout
   * - sessionId: Stripe checkout session ID
   */
  app.post("/api/payments/stripe/checkout", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { plan } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "No authentication token provided",
        });
      }

      logger.info({ userId, plan }, "Checkout session requested");

      // Validate plan
      if (!validatePlanTier(plan)) {
        return res.status(400).json({
          error: `Invalid plan. Must be one of: ${Object.keys(STRIPE_PLANS).join(", ")}`,
        });
      }

      const planConfig = STRIPE_PLANS[plan];
      if (!planConfig.priceId) {
        logger.error({ plan }, "Stripe price ID not configured for plan");
        return res.status(500).json({
          error: "Plan not available. Contact support.",
        });
      }

      // Get user for email
      const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userRecord.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const userEmail = userRecord[0].email;

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: userEmail,
        line_items: [
          {
            price: planConfig.priceId,
            quantity: 1,
          },
        ],
        success_url: `${FRONTEND_URL}/billing/success?sessionId={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_URL}/billing/cancel`,
        metadata: {
          userId,
          plan,
        },
      });

      logger.info(
        { sessionId: session.id, userId, plan },
        "Checkout session created successfully"
      );

      return res.status(200).json({
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error) {
      logger.error({ error }, "Failed to create Stripe checkout session");
      return res.status(500).json({
        error: "Failed to create checkout session. Please try again.",
      });
    }
  });

  /**
   * POST /api/payments/stripe/portal
   * Create a Stripe Customer Portal session for billing management
   *
   * Required:
   * - JWT auth
   * - User must have stripeCustomerId
   *
   * Returns:
   * - portalUrl: URL to Stripe customer portal
   */
  app.post("/api/payments/stripe/portal", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "No authentication token provided",
        });
      }

      logger.info({ userId }, "Portal session requested");

      // Get user
      const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userRecord.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const stripeCustomerId = userRecord[0].stripeCustomerId;
      if (!stripeCustomerId) {
        return res.status(400).json({
          error: "No active subscription. Please subscribe first.",
        });
      }

      // Create portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${FRONTEND_URL}/billing`,
      });

      logger.info({ sessionId: portalSession.id, userId }, "Portal session created");

      return res.status(200).json({
        portalUrl: portalSession.url,
      });
    } catch (error) {
      logger.error({ error }, "Failed to create Stripe portal session");
      return res.status(500).json({
        error: "Failed to access billing portal. Please try again.",
      });
    }
  });

  /**
   * POST /api/payments/stripe/subscription-status
   * Get current subscription status for user
   *
   * Required:
   * - JWT auth
   *
   * Returns:
   * - plan: Current subscription plan
   * - status: Subscription status (active, canceled, past_due, etc)
   * - currentPeriodEnd: Timestamp when current period ends
   */
  app.post("/api/payments/stripe/subscription-status", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "No authentication token provided",
        });
      }

      const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userRecord.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const plan = userRecord[0].currentPlan || "free";
      const stripeSubscriptionId = userRecord[0].stripeSubscriptionId;

      let subscriptionStatus = {
        plan,
        status: "active",
        currentPeriodEnd: null as number | null,
      };

      // Get subscription details from Stripe if available
      if (stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        subscriptionStatus = {
          plan,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end ? subscription.current_period_end * 1000 : null,
        };
      }

      return res.status(200).json(subscriptionStatus);
    } catch (error) {
      logger.error({ error }, "Failed to get subscription status");
      return res.status(500).json({
        error: "Failed to fetch subscription status",
      });
    }
  });
}
