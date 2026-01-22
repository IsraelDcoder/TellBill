/**
 * Receipt API Endpoints
 * Handles receipt extraction, storage, and activity creation
 */

import type { Express, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { receiptService } from "./receiptService";
import { db } from "./db";
import { projects, users } from "@shared/schema";
import { sql } from "drizzle-orm";

// Initialize router
const router = Router();
async function verifySubscriptionTier(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Query user's subscription
    const user = await db
      .select({ subscription_tier: users.subscription_tier })
      .from(users)
      .where(sql`${users.id} = ${userId}`)
      .limit(1);

    if (!user.length) {
      return res.status(401).json({ error: "User not found" });
    }

    const userTier = user[0].subscription_tier || "free";
    const allowedTiers = ["team", "enterprise"];

    if (!allowedTiers.includes(userTier)) {
      return res.status(403).json({
        error: "Receipt scanner requires TEAM or ENTERPRISE subscription",
        tier: userTier,
      });
    }

    next();
  } catch (error) {
    console.error("[receiptRoutes] Auth error:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
}

// Middleware to verify project access
async function verifyProjectAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { projectId } = req.body;
    const userId = req.user?.id;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const project = await db
      .select()
      .from(projects)
      .where(sql`${projects.id} = ${projectId}`)
      .limit(1);

    if (!project.length) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Verify user has access to project
    if (
      project[0].createdBy !== userId &&
      !project[0].members?.includes(userId)
    ) {
      return res.status(403).json({ error: "Access denied to this project" });
    }

    (req as any).project = project[0];
    next();
  } catch (error) {
    console.error("[receiptRoutes] Project access error:", error);
    res.status(500).json({ error: "Failed to verify project access" });
  }
}

/**
 * POST /api/receipts/extract
 * Extract receipt data from image
 */
router.post(
  "/extract",
  verifySubscriptionTier,
  verifyProjectAccess,
  async (req: Request, res: Response) => {
    try {
      const { photoBase64 } = req.body;

      if (!photoBase64) {
        return res.status(400).json({ error: "photoBase64 is required" });
      }

      // Extract receipt data using Vision AI
      const extracted = await receiptService.extractReceiptData(photoBase64);

      // Check for duplicates (don't fail if check fails)
      const isDuplicate = await receiptService.checkForDuplicate(
        req.body.projectId,
        extracted.vendor,
        extracted.grandTotal,
        extracted.date
      );

      res.json({
        success: true,
        data: extracted,
        isDuplicate,
      });
    } catch (error: any) {
      console.error("[receiptRoutes] Extraction error:", error);
      res.status(500).json({
        error: error.message || "Failed to extract receipt data",
        details:
          process.env.NODE_ENV === "development"
            ? error.toString()
            : undefined,
      });
    }
  }
);

/**
 * POST /api/receipts/process
 * Full receipt processing (extract + upload + create activity)
 */
router.post(
  "/process",
  verifySubscriptionTier,
  verifyProjectAccess,
  async (req: Request, res: Response) => {
    try {
      const { projectId, photoBase64 } = req.body;
      const userId = req.user?.id;

      if (!projectId || !photoBase64) {
        return res
          .status(400)
          .json({ error: "projectId and photoBase64 are required" });
      }

      // Process receipt (extract -> check duplicates -> upload -> create activity)
      const result = await receiptService.processReceipt(
        projectId,
        photoBase64,
        userId
      );

      res.json({
        success: true,
        activityId: result.activityId,
        extracted: result.extracted,
        isDuplicate: result.isDuplicate,
      });
    } catch (error: any) {
      console.error("[receiptRoutes] Processing error:", error);
      res.status(500).json({
        error: error.message || "Failed to process receipt",
        details:
          process.env.NODE_ENV === "development"
            ? error.toString()
            : undefined,
      });
    }
  }
);

/**
 * GET /api/receipts/pending
 * Get pending receipts (offline queue)
 */
router.get(
  "/pending",
  verifySubscriptionTier,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      // Query activities with status 'pending'
      // (This would be handled on client side with AsyncStorage)
      // This endpoint is for server-side pending queue if needed

      res.json({
        success: true,
        message: "Pending receipts are managed client-side via AsyncStorage",
      });
    } catch (error: any) {
      console.error("[receiptRoutes] Pending query error:", error);
      res.status(500).json({ error: "Failed to query pending receipts" });
    }
  }
);

/**
 * Register receipt routes with Express app
 */
export function registerReceiptRoutes(app: Express): void {
  app.use("/api/receipts", router);
  console.log("[receiptRoutes] Receipt API routes registered");
}
