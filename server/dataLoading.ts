import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { invoices, projects, team, preferences, users } from "@shared/schema";
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
   * GET /api/data/projects?userId={userId}
   * Get all projects belonging to a user
   */
  app.get("/api/data/projects", async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== "string") {
        return res.status(400).json({
          success: false,
          error: "userId query parameter is required",
        });
      }

      // ✅ Filter by userId for security
      const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId));

      return res.status(200).json({
        success: true,
        data: userProjects,
      });
    } catch (error) {
      console.error("[Data] Error fetching projects:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch projects",
      });
    }
  });

  /**
   * GET /api/data/team?userId={userId}
   * Get all team members for a user
   */
  app.get("/api/data/team", async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== "string") {
        return res.status(400).json({
          success: false,
          error: "userId query parameter is required",
        });
      }

      // ✅ Filter by ownerUserId (team members are owned by the user who added them)
      const userTeam = await db
        .select()
        .from(team)
        .where(eq(team.ownerUserId, userId));

      return res.status(200).json({
        success: true,
        data: userTeam,
      });
    } catch (error) {
      console.error("[Data] Error fetching team:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch team members",
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

      if (!userId || typeof userId !== "string") {
        return res.status(400).json({
          success: false,
          error: "userId query parameter is required",
        });
      }

      // ✅ Fetch all user data in parallel (efficient)
      const [userInvoices, userProjects, userTeam, userPreferences, userProfile] =
        await Promise.all([
          db
            .select()
            .from(invoices)
            .where(eq(invoices.userId, userId)),
          db
            .select()
            .from(projects)
            .where(eq(projects.userId, userId)),
          db
            .select()
            .from(team)
            .where(eq(team.ownerUserId, userId)),
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
        ]);

      // ✅ Build rehydration response
      // Frontend will use this to restore all app state
      return res.status(200).json({
        success: true,
        data: {
          invoices: userInvoices,
          projects: userProjects,
          team: userTeam,
          preferences: userPreferences,
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
          // TODO: Add subscription data when available
          subscription: {
            userEntitlement: "free",
            subscription: null,
            voiceRecordingsUsed: 0,
            invoicesCreated: userInvoices.length,
            currentPlan: "free",
            isSubscribed: false,
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
