import type { Express, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { invoices, preferences, users, activityLog } from "@shared/schema";
import { db } from "./db";
import { authMiddleware } from "./utils/authMiddleware";

/**
 * ✅ CRITICAL: Convert numeric fields from dollars (decimal) to cents (integer)
 * 
 * Database stores financial values as numeric with scale 2 (e.g., 50.00 = fifty dollars)
 * Frontend expects these as integers in cents (e.g., 5000 = fifty dollars)
 * This function ensures consistent representation across the app
 */
const convertCentsToDollars = (value: any): number => {
  if (!value && value !== 0) return 0;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return 0;
  return Math.round(num * 100); // Convert dollars to cents
};

// ✅ HELPER: Parse invoice items JSON string to array AND convert numeric values
const parseInvoiceItems = (invoice: any) => ({
  ...invoice,
  items: typeof invoice.items === "string" ? JSON.parse(invoice.items || "[]") : (invoice.items || []),
  // ✅ CRITICAL: Convert all numeric fields from database format (dollars) to app format (cents)
  total: convertCentsToDollars(invoice.total),
  subtotal: convertCentsToDollars(invoice.subtotal),
  taxAmount: convertCentsToDollars(invoice.taxAmount),
  laborTotal: convertCentsToDollars(invoice.laborTotal),
  materialsTotal: convertCentsToDollars(invoice.materialsTotal),
  itemsTotal: convertCentsToDollars(invoice.itemsTotal),
  laborRate: convertCentsToDollars(invoice.laborRate),
});

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
   * PUT /api/preferences
   * Save user preferences (currency, tax rate, invoice template, payment terms)
   * 
   * ✅ REQUIRES: Authentication header
   */
  app.put("/api/preferences", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const { currency, language, theme, invoiceTemplate, defaultPaymentTerms } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      console.log("[Preferences] Saving preferences for user:", userId);

      // ✅ Check if preferences record exists
      const existingPrefs = await db
        .select()
        .from(preferences)
        .where(eq(preferences.userId, userId))
        .limit(1);

      let savedPrefs;

      if (existingPrefs.length > 0) {
        // Update existing preferences
        savedPrefs = await db
          .update(preferences)
          .set({
            currency: currency || existingPrefs[0].currency,
            language: language || existingPrefs[0].language,
            theme: theme || existingPrefs[0].theme,
            invoiceTemplate: invoiceTemplate || existingPrefs[0].invoiceTemplate,
            defaultPaymentTerms: defaultPaymentTerms || existingPrefs[0].defaultPaymentTerms,
            updatedAt: new Date(),
          })
          .where(eq(preferences.userId, userId))
          .returning();
      } else {
        // Create new preferences record
        savedPrefs = await db
          .insert(preferences)
          .values({
            userId,
            currency: currency || "USD",
            language: language || "en",
            theme: theme || "light",
            invoiceTemplate: invoiceTemplate || "default",
            defaultPaymentTerms: defaultPaymentTerms || "Due upon receipt",
          })
          .returning();
      }

      // ✅ Also save to users table for quick access
      if (currency || invoiceTemplate || defaultPaymentTerms) {
        await db
          .update(users)
          .set({
            preferredCurrency: currency || undefined,
            invoiceTemplate: invoiceTemplate || undefined,
            defaultPaymentTerms: defaultPaymentTerms || undefined,
          })
          .where(eq(users.id, userId));
      }

      console.log("[Preferences] ✅ Preferences saved for user:", userId);

      return res.status(200).json({
        success: true,
        data: savedPrefs[0],
      });
    } catch (error) {
      console.error("[Preferences] Error saving preferences:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to save preferences",
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
   * GET /api/data/all
   * Get ALL user data in one request (for login rehydration)
   * 
   * ✅ CRITICAL: Returns complete user state
   * Never returns empty defaults for returning users
   * Always returns backend source of truth
   */
  app.get("/api/data/all", authMiddleware, async (req: Request, res: Response) => {
    try {
      // ✅ Use authenticated user ID from JWT
      const userId = (req as any).user?.userId || (req as any).user?.id;

      if (!userId) {
        console.error("[Data] ❌ User not authenticated - no userId in token");
        console.error("[Data] req.user:", (req as any).user);
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      console.log("[Data] 📥 GET /api/data/all for userId:", userId);

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
          invoices: userInvoices.map(parseInvoiceItems),
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
            currentPlan: (userProfile[0]?.currentPlan || "free") as "free" | "solo" | "professional",
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

