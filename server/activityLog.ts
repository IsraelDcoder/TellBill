import type { Express, Request, Response } from "express";
import { activityLog } from "@shared/schema";
import { db } from "./db";

/**
 * Activity Log Service
 * Records all user actions (invoice creation, sending, etc.)
 * Provides audit trail for compliance and activity restoration
 */

export interface LogActivityRequest {
  userId: string;
  action: string; // "created_invoice", "sent_invoice", "approved_invoice", etc.
  resourceType: string; // "invoice", "project", etc.
  resourceId: string;
  resourceName?: string;
  details?: Record<string, any>;
}

/**
 * Log an activity to the database
 * Called from client or internal services
 */
export async function logActivity(req: LogActivityRequest): Promise<void> {
  try {
    await db.insert(activityLog).values({
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: req.userId,
      action: req.action,
      resourceType: req.resourceType,
      resourceId: req.resourceId,
      details: req.details ? JSON.stringify(req.details) : null,
      timestamp: new Date(),
    });
    console.log(`[ActivityLog] Logged: ${req.action} for ${req.resourceType} ${req.resourceId}`);
  } catch (error) {
    console.error("[ActivityLog] Error logging activity:", error);
    // Non-blocking: Activity log failures should not break primary operations
  }
}

/**
 * Register activity log routes
 */
export function registerActivityLogRoutes(app: Express) {
  /**
   * POST /api/activity/log
   * Log an activity from the client
   */
  app.post("/api/activity/log", async (req: Request, res: Response) => {
    try {
      const { userId, action, resourceType, resourceId, resourceName, details } = req.body;

      if (!userId || !action || !resourceType || !resourceId) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: userId, action, resourceType, resourceId",
        });
      }

      await logActivity({
        userId,
        action,
        resourceType,
        resourceId,
        resourceName,
        details,
      });

      return res.status(200).json({
        success: true,
        message: "Activity logged successfully",
      });
    } catch (error) {
      console.error("[ActivityLog] Error in /api/activity/log:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to log activity",
      });
    }
  });
}
