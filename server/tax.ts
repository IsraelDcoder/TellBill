/**
 * Tax API Routes
 * 
 * GET /api/tax/profile - Get current user's tax settings
 * PUT /api/tax/profile - Update user's tax settings
 * 
 * All routes require authentication
 */

import type { Express, Request, Response } from "express";
import { getDefaultTaxProfile, saveTaxProfile } from "./taxService";

export function registerTaxRoutes(app: Express) {
  /**
   * GET /api/tax/profile
   * 
   * Returns user's current tax profile
   * Used when rendering tax settings screen
   * 
   * Response:
   * {
   *   success: true,
   *   profile: {
   *     id, name, rate, appliesto, enabled, isDefault, createdAt, updatedAt
   *   }
   * }
   * or
   * {
   *   success: true,
   *   profile: null  // if user has no tax profile yet
   * }
   */
  app.get("/api/tax/profile", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const { db } = await import("./db");
      const profile = await getDefaultTaxProfile(db, userId);

      return res.status(200).json({
        success: true,
        profile: profile || null,
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[Tax GET] Error:", errorMsg);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch tax profile",
      });
    }
  });

  /**
   * PUT /api/tax/profile
   * 
   * Update user's tax profile
   * Creates new if doesn't exist, updates if exists
   * 
   * Request body:
   * {
   *   name: string (1-40 chars),
   *   rate: number (0-30),
   *   appliesto: "labor_only" | "materials_only" | "labor_and_materials",
   *   enabled: boolean
   * }
   * 
   * Response:
   * {
   *   success: true,
   *   profile: { ... }
   * }
   * or
   * {
   *   success: false,
   *   error: "error message"
   * }
   * 
   * IMPORTANT: Changes only apply to new invoices
   * Existing invoices keep their tax snapshot
   */
  app.put("/api/tax/profile", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const { name, rate, appliesto, enabled } = req.body;

      // Basic validation
      if (!name || typeof name !== "string") {
        return res.status(400).json({
          success: false,
          error: "name is required and must be a string",
        });
      }

      if (typeof rate !== "number") {
        return res.status(400).json({
          success: false,
          error: "rate is required and must be a number",
        });
      }

      if (!appliesto || typeof appliesto !== "string") {
        return res.status(400).json({
          success: false,
          error: "appliesto is required and must be a string",
        });
      }

      if (typeof enabled !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "enabled is required and must be a boolean",
        });
      }

      const { db } = await import("./db");

      console.log("[Tax PUT] Updating tax profile for user:", userId);

      const result = await saveTaxProfile(db, userId, {
        name: name.trim(),
        rate,
        appliesto,
        enabled,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      console.log("[Tax PUT] Tax profile updated:", result.profile?.id);

      return res.status(200).json({
        success: true,
        message: "Tax profile updated successfully",
        profile: result.profile,
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[Tax PUT] Error:", errorMsg);
      return res.status(500).json({
        success: false,
        error: "Failed to update tax profile",
      });
    }
  });
}
