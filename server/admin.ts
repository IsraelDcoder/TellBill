import type { Express, Request, Response } from "express";
import { authMiddleware } from "./utils/authMiddleware";
import { attachSubscriptionMiddleware } from "./utils/subscriptionGuard";
import { 
  sendLatePaymentDay2Reminders, 
  sendLatePaymentDay6Reminders 
} from "./emailService";

/**
 * Admin endpoints for testing and manual triggering of automation features
 * All admin endpoints require authentication
 */
export function registerAdminRoutes(app: Express) {
  
  /**
   * POST /api/admin/trigger-late-payment-reminders
   * Manually trigger late payment reminder checks
   * Useful for testing without waiting for scheduled runs
   * Admin use only
   */
  app.post("/api/admin/trigger-late-payment-reminders", authMiddleware, async (req: Request, res: Response) => {
    try {
      console.log("[Admin] 🔔 Manual late payment reminder trigger requested by user:", (req as any).userId);
      
      // Run both Day 2 and Day 6 reminder checks
      const [day2Results, day6Results] = await Promise.all([
        sendLatePaymentDay2Reminders(),
        sendLatePaymentDay6Reminders(),
      ]);

      // Return summary of results
      return res.json({
        success: true,
        message: "Late payment reminders triggered successfully",
        data: {
          day2Reminders: {
            sent: day2Results?.sent || 0,
            skipped: day2Results?.skipped || 0,
          },
          day6Reminders: {
            sent: day6Results?.sent || 0,
            skipped: day6Results?.skipped || 0,
          },
          totalSent: (day2Results?.sent || 0) + (day6Results?.sent || 0),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("[Admin] ❌ Error triggering late payment reminders:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to trigger late payment reminders",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/admin/health
   * Simple health check endpoint for monitoring
   */
  app.get("/api/admin/health", authMiddleware, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      message: "Server is healthy",
      timestamp: new Date().toISOString(),
    });
  });

  console.log("[Server] ✅ Admin routes registered");
}
