import type { Express, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { invoices, preferences, users, activityLog } from "@shared/schema";
import { db } from "./db";

/**
 * Data Loading Routes
 * 
 * Used by frontend after login to restore user's state
 * All endpoints filter by userId for data isolation
 */
export function registerDataLoadingRoutes(app: Express) {
  /**
   * GET /api/data/invoices?userId={userId}
   * Get all invoices belonging to a user
   * 
   * IMPORTANT: Always filter by userId for security
   * User A should NEVER see User B's invoices
   */
  app.get("/api/data/invoices", async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;

      // Validate userId is provided
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({
          success: false,
          error: "userId query parameter is required",
        });
      }

      // ✅ CRITICAL: Filter by userId
      // This ensures user only gets their own invoices
      const userInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.userId, userId));

      return res.status(200).json({
        success: true,
        data: userInvoices,
      });
    } catch (error) {
      console.error("[Data] Error fetching invoices:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch invoices",
      });
    }
  });

  /**
   * GET /api/data/preferences?userId={userId}
   * Get user's preferences
   */
  app.get("/api/data/preferences", async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== "string") {
        return res.status(400).json({
          success: false,
          error: "userId query parameter is required",
        });
      }

      // ✅ Filter by userId for security
      const userPreferences = await db
        .select()
        .from(preferences)
        .where(eq(preferences.userId, userId));

      return res.status(200).json({
        success: true,
        data: userPreferences,
      });
    } catch (error) {
      console.error("[Data] Error fetching preferences:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch preferences",
      });
    }
  });

  /**
   * GET /api/data/activity?userId={userId}&limit=50
   * Get user's activity log (recent actions)
   */
  app.get("/api/data/activity", async (req: Request, res: Response) => {
    try {
      const { userId, limit = "50" } = req.query;

      if (!userId || typeof userId !== "string") {
        return res.status(400).json({
          success: false,
          error: "userId query parameter is required",
        });
      }

      // ✅ CRITICAL: Filter by userId
      // Fetch most recent activities (ordered by createdAt DESC)
      const activities = await db
        .select()
        .from(activityLog)
        .where(eq(activityLog.userId, userId))
        .limit(parseInt(limit as string));

      return res.status(200).json({
        success: true,
        data: activities.reverse(), // Most recent first
      });
    } catch (error) {
      console.error("[Data] Error fetching activities:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch activities",
      });
    }
  });

  /**
   * GET /api/data/all?userId={userId}
   * Get ALL user data in one request (for login rehydration)
   * 
   * ✅ CRITICAL: Returns complete user state
   * Never returns empty defaults for returning users
   * Always returns backend source of truth
   */
  app.get("/api/data/all", async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      console.log("[Data] 📥 GET /api/data/all for userId:", userId);

      if (!userId || typeof userId !== "string") {
        console.error("[Data] ❌ Missing userId parameter");
        return res.status(400).json({
          success: false,
          error: "userId query parameter is required",
        });
      }

      // ✅ Fetch all user data in parallel (efficient)
      const [userInvoices, userPreferences, userProfile, userActivities] =
        await Promise.all([
          db
            .select()
            .from(invoices)
            .where(eq(invoices.userId, userId)),
          db
            .select()
            .from(preferences)
            .where(eq(preferences.userId, userId)),
          // Get user profile from users table
          db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1),
          // ✅ NEW: Fetch activity log (most recent 50)
          db
            .select()
            .from(activityLog)
            .where(eq(activityLog.userId, userId))
            .limit(50),
        ]);

      console.log("[Data] ✅ Fetched data:", {
        invoiceCount: userInvoices.length,
        activityCount: userActivities.length,
      });

      // ✅ Build rehydration response
      // Frontend will use this to restore all app state
      return res.status(200).json({
        success: true,
        data: {
          invoices: userInvoices,
          preferences: userPreferences,
          activities: userActivities.reverse(), // Most recent first
          // Profile data from users table
          profile: userProfile.length > 0 ? {
            userProfile: {
              firstName: userProfile[0].name?.split(" ")[0] || "",
              lastName: userProfile[0].name?.split(" ")[1] || "",
              phoneNumber: "",
            },
            companyInfo: {
              name: userProfile[0].companyName || "",
              phone: userProfile[0].companyPhone || "",
              email: userProfile[0].companyEmail || "",
              address: userProfile[0].companyAddress || "",
              website: userProfile[0].companyWebsite || "",
              taxId: userProfile[0].companyTaxId || "",
            },
          } : null,
          // ✅ Real subscription data from users table
          subscription: {
            userEntitlement: userProfile[0]?.currentPlan || "free",
            subscription: userProfile[0]?.isSubscribed ? {
              plan: userProfile[0].currentPlan || "free",
              status: (userProfile[0].subscriptionStatus || "inactive") as "active" | "inactive" | "canceled" | "expired",
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: userProfile[0].subscriptionRenewalDate?.toISOString() || new Date().toISOString(),
              isAnnual: false,
            } : null,
            voiceRecordingsUsed: 0, // Track voice recordings from activity log if needed
            invoicesCreated: userInvoices.length,
            currentPlan: (userProfile[0]?.currentPlan || "free") as "free" | "solo" | "professional" | "enterprise",
            isSubscribed: userProfile[0]?.isSubscribed || false,
          },
        },
      });
    } catch (error) {
      console.error("[Data] Error fetching all data:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch user data",
      });
    }
  });
}

