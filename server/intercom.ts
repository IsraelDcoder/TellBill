import type { Express, Request, Response } from "express";
import { authMiddleware } from "./utils/authMiddleware";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * ✅ Intercom Integration
 * In-app chat for trust & support
 * Even if no one messages, the chat icon increases trust and conversion rates
 */

const INTERCOM_SECRET_KEY = process.env.INTERCOM_SECRET_KEY || "";
const INTERCOM_ACCESS_TOKEN = process.env.INTERCOM_ACCESS_TOKEN || "";

export function registerIntercomRoutes(app: Express) {
  /**
   * GET /api/intercom/auth-token
   * Generate Intercom auth hash for secure client initialization
   * Allows seamless chat without additional login
   */
  app.get("/api/intercom/auth-token", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      // Fetch user data for Intercom
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || user.length === 0) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      const userData = user[0];
      const crypto = require("crypto");

      // Create Intercom user identity hash
      // This ensures secure communication between client and Intercom
      const identityTokenData = JSON.stringify({
        user_id: userId,
        email: userData.email,
        name: userData.name || userData.email.split("@")[0],
      });

      const hash = crypto
        .createHmac("sha256", INTERCOM_SECRET_KEY)
        .update(identityTokenData)
        .digest("hex");

      console.log(`[Intercom] ✅ Auth token generated for user ${userId}`);

      return res.json({
        success: true,
        identity_token: hash,
        user_data: {
          user_id: userId,
          email: userData.email,
          name: userData.name || userData.email.split("@")[0],
          company_name: userData.companyName || "TellBill Contractor",
          plan: userData.currentPlan,
          created_at: Math.floor(userData.createdAt?.getTime() / 1000) || Date.now(),
        },
      });
    } catch (error) {
      console.error("[Intercom] Error generating auth token:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to generate Intercom token",
      });
    }
  });

  /**
   * POST /api/intercom/track-event
   * Track user actions in Intercom for analytics
   * Events: chat_opened, support_request, feature_inquiry, etc.
   */
  app.post("/api/intercom/track-event", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { eventName, metadata } = req.body;

      if (!userId || !eventName) {
        return res.status(400).json({
          success: false,
          error: "User ID and event name are required",
        });
      }

      // Log event server-side for debugging
      console.log(`[Intercom] Event tracked for user ${userId}: ${eventName}`, metadata);

      // In production, you would send this to Intercom API:
      // const response = await fetch('https://api.intercom.io/events', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${INTERCOM_ACCESS_TOKEN}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     event_name: eventName,
      //     user_id: userId,
      //     created_at: Math.floor(Date.now() / 1000),
      //     metadata: metadata || {},
      //   }),
      // });

      return res.json({
        success: true,
        event: eventName,
        tracked_for_user: userId,
      });
    } catch (error) {
      console.error("[Intercom] Error tracking event:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to track event",
      });
    }
  });

  /**
   * POST /api/intercom/webhook
   * Receive messages from Intercom
   * Webhook signature verification required
   */
  app.post("/api/intercom/webhook", async (req: Request, res: Response) => {
    try {
      const signature = req.headers["x-intercom-webhook-signature"] as string;
      const body = JSON.stringify(req.body);

      // Verify webhook signature
      const crypto = require("crypto");
      const hash = crypto
        .createHmac("sha256", INTERCOM_SECRET_KEY)
        .update(body)
        .digest("base64");

      if (hash !== signature) {
        console.warn("[Intercom] ⚠️ Invalid webhook signature");
        return res.status(401).json({ success: false, error: "Invalid signature" });
      }

      const eventData = req.body.data;

      // Handle different webhook events
      if (eventData.type === "conversation.user.created") {
        // User started a new conversation
        console.log(`[Intercom] 💬 New conversation from user: ${eventData.user?.id}`);
      } else if (eventData.type === "conversation.user.replied") {
        // User replied in conversation
        console.log(`[Intercom] 💬 User replied: ${eventData.user?.id}`);
      } else if (eventData.type === "user.created") {
        // New user signed up
        console.log(`[Intercom] 👤 New user: ${eventData.user?.email}`);
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("[Intercom] Error processing webhook:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to process webhook",
      });
    }
  });

  /**
   * GET /api/intercom/config
   * Get Intercom initialization config for frontend
   * Returns: app_id and other settings
   */
  app.get("/api/intercom/config", (_req: Request, res: Response) => {
    try {
      const INTERCOM_APP_ID = process.env.INTERCOM_APP_ID;

      if (!INTERCOM_APP_ID) {
        return res.status(500).json({
          success: false,
          error: "Intercom not configured",
        });
      }

      return res.json({
        success: true,
        config: {
          app_id: INTERCOM_APP_ID,
          hide_default_launcher: false, // Show chat icon
          alignment: "right", // Chat on right side
          vertical_padding: 20,
          horizontal_padding: 20,
        },
      });
    } catch (error) {
      console.error("[Intercom] Error getting config:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get Intercom config",
      });
    }
  });
}
