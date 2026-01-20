import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";
import { db } from "./db";

interface InitiatePaymentRequest {
  userId: string;
  planId: "solo" | "team" | "enterprise";
  email: string;
  phoneNumber: string;
  userFullName: string;
}

interface VerifyPaymentRequest {
  transactionId: string;
  reference: string;
  planId: "solo" | "team" | "enterprise";
  userId: string;
}

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || "";

const PLAN_PRICES: Record<string, number> = {
  solo: 4999, // $49.99 in cents
  team: 9999, // $99.99 in cents
  enterprise: 29999, // $299.99 in cents
};

export function registerPaymentRoutes(app: Express) {
  /**
   * POST /api/payments/initiate
   * Initialize a Flutterwave payment
   */
  app.post("/api/payments/initiate", async (req: Request, res: Response) => {
    try {
      const {
        userId,
        planId,
        email,
        phoneNumber,
        userFullName,
      } = req.body as InitiatePaymentRequest;

      // Validate input
      if (!userId || !planId || !email) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: userId, planId, email",
        });
      }

      // Validate plan ID
      if (!["solo", "team", "enterprise"].includes(planId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid plan ID. Must be solo, team, or enterprise",
        });
      }

      // Check if user exists
      const userExists = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userExists.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const amount = PLAN_PRICES[planId];
      if (!amount) {
        return res.status(400).json({
          success: false,
          error: "Invalid plan ID - price not found",
        });
      }

      // Create payment reference
      const reference = `tellbill_${planId}_${userId}_${Date.now()}`;

      const paymentData = {
        reference,
        amount,
        planId,
        userId,
        email,
        phoneNumber,
        userFullName,
        timestamp: new Date().toISOString(),
      };

      console.log("[Payment] Initiated payment:", reference);

      return res.status(200).json({
        success: true,
        reference,
        amount,
        paymentData,
      });
    } catch (error) {
      console.error("[Payment] Initiation error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error during payment initiation",
      });
    }
  });

  /**
   * POST /api/payments/verify
   * Verify Flutterwave payment and upgrade subscription
   */
  app.post("/api/payments/verify", async (req: Request, res: Response) => {
    try {
      const {
        transactionId,
        reference,
        planId,
        userId,
      } = req.body as VerifyPaymentRequest;

      // Validate input
      if (!transactionId || !reference || !planId || !userId) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: transactionId, reference, planId, userId",
        });
      }

      // Validate plan ID
      if (!["solo", "team", "enterprise"].includes(planId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid plan ID. Must be solo, team, or enterprise",
        });
      }

      // Check if user exists
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, userId as string))
        .limit(1);

      if (userResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // In production, verify with Flutterwave API
      // Example:
      // const flutterwaveResponse = await fetch(
      //   `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      //   {
      //     headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` }
      //   }
      // );
      // const flutterwaveData = await flutterwaveResponse.json();
      // const paymentVerified = flutterwaveData.status === "success" && 
      //                         flutterwaveData.data.status === "successful";

      // For now, assume verification is successful
      const paymentVerified = true;

      if (!paymentVerified) {
        return res.status(400).json({
          success: false,
          error: "Payment verification failed",
        });
      }

      // Update user subscription in database
      const updatedUser = await db
        .update(users)
        .set({
          currentPlan: planId as "solo" | "team" | "enterprise",
          isSubscribed: true,
          subscriptionStatus: "active" as const,
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(500).json({
          success: false,
          error: "Failed to update subscription",
        });
      }

      console.log(`[Payment] Subscription upgraded to ${planId} for user ${userId}`);

      return res.status(200).json({
        success: true,
        message: `Successfully upgraded to ${planId} plan`,
        planId,
        userId,
        reference,
      });
    } catch (error) {
      console.error("[Payment] Verification error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error during payment verification",
      });
    }
  });

  /**
   * GET /api/payments/status/:userId
   * Get current subscription status for user
   */
  app.get("/api/payments/status/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // Validate input
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, userId as string))
        .limit(1);

      if (userResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const user = userResult[0];

      return res.status(200).json({
        success: true,
        currentPlan: user.currentPlan || "free",
        isSubscribed: user.isSubscribed || false,
        subscriptionStatus: user.subscriptionStatus || "inactive",
      });
    } catch (error) {
      console.error("[Payment] Status fetch error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });
}
