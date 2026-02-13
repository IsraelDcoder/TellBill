/**
 * Money Alerts System
 * 
 * Tracks unbilled work (receipts, scope, voice logs, invoices)
 * Creates actionable alerts for contractors to prevent lost revenue
 * Paid-only feature (Solo+)
 */

import type { Express, Request, Response } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { receipts, moneyAlerts, moneyAlertEvents } from "@shared/schema";
import { db } from "./db";
import { authMiddleware } from "./utils/authMiddleware";
import { requirePaidPlan } from "./utils/subscriptionGuard";
import { MoneyAlertsEngine } from "./moneyAlertsEngine";
import { randomUUID } from "crypto";

/**
 * Check for unbilled material costs (old API - for backward compatibility)
 * Returns list of receipts that are billable but not linked to invoices
 */
export async function getUnbilledMaterials(userId: string) {
  return await db
    .select()
    .from(receipts)
    .where(
      and(
        eq(receipts.userId, userId),
        eq(receipts.billable, true),
        isNull(receipts.linkedInvoiceId)
      )
    );
}

/**
 * Calculate total unbilled material amount (in cents)
 */
export async function getTotalUnbilledAmount(userId: string): Promise<number> {
  const unbilled = await getUnbilledMaterials(userId);
  const total = unbilled.reduce((sum, receipt) => {
    // Sum the amounts (already in cents)
    return sum + Math.round(parseFloat(receipt.totalAmount as unknown as string) * 100);
  }, 0);
  return total; // Return as integer cents, not formatted string
}

/**
 * Money Alert: Structure for returning to frontend
 */
export interface MoneyAlert {
  type: "unbilled_materials";
  severity: "warning" | "critical";
  title: string;
  description: string;
  amount: number; // Integer cents
  count: number;
  actionCta: string;
  receipts: Array<{
    id: string;
    vendor: string;
    amount: number; // Integer cents
    date: string;
  }>;
}

/**
 * Generate Money Alert for unbilled materials
 */
export async function generateMoneyAlert(userId: string): Promise<MoneyAlert | null> {
  const unbilled = await getUnbilledMaterials(userId);

  if (unbilled.length === 0) {
    return null;
  }

  const total = unbilled.reduce((sum, receipt) => {
    return sum + parseFloat(receipt.totalAmount as unknown as string);
  }, 0);

  const severity = total > 50000 ? "critical" : "warning"; // 50000 cents = $500

  return {
    type: "unbilled_materials",
    severity,
    title: `$${(total / 100).toFixed(2)} in Unbilled Materials`,
    description: `You have ${unbilled.length} material receipt${unbilled.length !== 1 ? "s" : ""} ready to bill to clients.`,
    amount: total, // Return as integer cents for API consistency
    count: unbilled.length,
    actionCta: "Attach to Invoice",
    receipts: unbilled.map((r) => ({
      id: r.id,
      vendor: r.vendor,
      amount: Math.round(parseFloat(r.totalAmount as unknown as string) * 100), // Convert to cents
      date: r.purchaseDate.toISOString().split("T")[0],
    })),
  };
}

/**
 * Register Money Alert routes
 */
export function registerMoneyAlertRoutes(app: Express) {
  /**
   * GET /api/alerts/money
   * Get active money alerts for user (old API - backward compatible)
   */
  app.get("/api/alerts/money", authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.userId;

      const alert = await generateMoneyAlert(userId);

      return res.status(200).json({
        success: true,
        data: {
          alerts: alert ? [alert] : [],
        },
      });
    } catch (error) {
      console.error("[Money Alerts] Error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch alerts",
      });
    }
  });

  /**
   * GET /api/alerts/money/unbilled-materials
   * Get detailed list of unbilled materials (old API - backward compatible)
   */
  app.get(
    "/api/alerts/money/unbilled-materials",
    authMiddleware,
    async (req: any, res: Response) => {
      try {
        const userId = req.userId;

        const unbilled = await getUnbilledMaterials(userId);
        const total = await getTotalUnbilledAmount(userId);

        return res.status(200).json({
          success: true,
          data: {
            total,
            count: unbilled.length,
            receipts: unbilled.map((r) => ({
              id: r.id,
              vendor: r.vendor,
              amount: Math.round(parseFloat(r.totalAmount as unknown as string) * 100), // Convert to cents for API consistency
              date: r.purchaseDate.toISOString().split("T")[0],
              clientName: r.clientName,
              clientEmail: r.clientEmail,
              imageUrl: r.imageUrl,
            })),
          },
        });
      } catch (error) {
        console.error("[Money Alerts] Unbilled error:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch unbilled materials",
        });
      }
    }
  );

  /**
   * GET /api/money-alerts
   * Get all open alerts for authenticated user (new API)
   * Requires: Auth + Paid plan (Solo+)
   */
  app.get("/api/money-alerts", authMiddleware, requirePaidPlan, async (req: any, res: Response) => {
    try {
      const userId = req.userId || (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get all open alerts
      const alerts = await db.query.moneyAlerts.findMany({
        where: and(
          eq(moneyAlerts.userId, userId),
          eq(moneyAlerts.status, "open")
        ),
        orderBy: (a, { desc }) => desc(a.createdAt),
      });

      // Get summary
      const summary = await MoneyAlertsEngine.getAlertSummary(userId);

      res.json({
        success: true,
        data: {
          alerts,
          summary,
        },
      });
    } catch (error) {
      console.error("[Money Alerts] Error fetching alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  /**
   * GET /api/money-alerts/:id
   * Get specific alert
   */
  app.get("/api/money-alerts/:id", authMiddleware, requirePaidPlan, async (req: any, res: Response) => {
    try {
      const userId = req.userId || (req as any).user?.id;
      const { id } = req.params;

      const alert = await db.query.moneyAlerts.findFirst({
        where: and(
          eq(moneyAlerts.id, id),
          eq(moneyAlerts.userId, userId)
        ),
      });

      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      res.json({ success: true, data: alert });
    } catch (error) {
      console.error("[Money Alerts] Error fetching alert:", error);
      res.status(500).json({ error: "Failed to fetch alert" });
    }
  });

  /**
   * POST /api/money-alerts/:id/fix
   * Fix an alert (attach to invoice, create invoice, send invoice, etc.)
   * Body depends on type:
   * - RECEIPT_UNBILLED: { targetInvoiceId } or { createNew: true }
   * - SCOPE_APPROVED_NO_INVOICE: { targetInvoiceId } or { createNew: true }
   * - VOICE_LOG_NO_INVOICE: { targetInvoiceId } or { createNew: true }
   * - INVOICE_NOT_SENT: { send: true }
   */
  app.post(
    "/api/money-alerts/:id/fix",
    authMiddleware,
    requirePaidPlan,
    async (req: any, res: Response) => {
      try {
        const userId = req.userId || (req as any).user?.id;
        const { id } = req.params;
        const { targetInvoiceId, createNew, send } = req.body;

        // Get alert
        const alert = await db.query.moneyAlerts.findFirst({
          where: and(
            eq(moneyAlerts.id, id),
            eq(moneyAlerts.userId, userId)
          ),
        });

        if (!alert) {
          return res.status(404).json({ error: "Alert not found" });
        }

        if (alert.status !== "open") {
          return res.status(400).json({ error: "Alert is not open" });
        }

        let result: any = { success: true };

        // Handle based on alert type
        if (alert.type === "RECEIPT_UNBILLED") {
          if (targetInvoiceId) {
            // Attach receipt to existing invoice
            await db
              .update(receipts)
              .set({
                linkedInvoiceId: targetInvoiceId,
              })
              .where(eq(receipts.id, alert.sourceId));

            result.action = "attached_to_invoice";
          } else if (createNew) {
            // TODO: Create new invoice from receipt
            result.action = "created_new_invoice";
            result.message = "TODO: Implement receipt-to-invoice creation";
          }
        } else if (alert.type === "SCOPE_APPROVED_NO_INVOICE") {
          if (targetInvoiceId) {
            // TODO: Attach scope to existing invoice
            result.action = "attached_to_invoice";
            result.message = "TODO: Implement scope-to-invoice attachment";
          } else if (createNew) {
            // TODO: Generate invoice from scope
            result.action = "generated_invoice";
            result.message = "TODO: Implement scope-to-invoice generation";
          }
        } else if (alert.type === "VOICE_LOG_NO_INVOICE") {
          if (targetInvoiceId) {
            // Attach transcript to existing invoice
            // TODO: Update transcript table
            result.action = "attached_to_invoice";
            result.message = "TODO: Implement transcript-to-invoice attachment";
          } else if (createNew) {
            // TODO: Create invoice from transcript
            result.action = "created_new_invoice";
            result.message = "TODO: Implement transcript-to-invoice creation";
          }
        } else if (alert.type === "INVOICE_NOT_SENT") {
          if (send) {
            // TODO: Send invoice using existing send logic
            result.action = "sent_invoice";
            result.message = "TODO: Implement invoice send";
          }
        }

        // Mark alert as FIXED
        await db
          .update(moneyAlerts)
          .set({
            status: "fixed",
            updatedAt: new Date(),
          })
          .where(eq(moneyAlerts.id, id));

        // Log event
        await db.insert(moneyAlertEvents).values({
          id: randomUUID(),
          alertId: id,
          userId,
          action: "FIXED",
          metadata: JSON.stringify({ action: result.action, body: req.body }),
        } as any);

        res.json(result);
      } catch (error) {
        console.error("[Money Alerts] Error fixing alert:", error);
        res.status(500).json({ error: "Failed to fix alert" });
      }
    }
  );

  /**
   * POST /api/money-alerts/:id/resolve
   * Mark alert as resolved (dismissed with reason)
   * Body: { reason: string, note?: string }
   * Reasons: "included_in_contract" | "warranty" | "personal" | "customer_refused" | "other"
   */
  app.post(
    "/api/money-alerts/:id/resolve",
    authMiddleware,
    requirePaidPlan,
    async (req: any, res: Response) => {
      try {
        const userId = req.userId || (req as any).user?.id;
        const { id } = req.params;
        const { reason, note } = req.body;

        if (!reason) {
          return res.status(400).json({ error: "Reason is required" });
        }

        // Get alert
        const alert = await db.query.moneyAlerts.findFirst({
          where: and(
            eq(moneyAlerts.id, id),
            eq(moneyAlerts.userId, userId)
          ),
        });

        if (!alert) {
          return res.status(404).json({ error: "Alert not found" });
        }

        if (alert.status !== "open") {
          return res.status(400).json({ error: "Alert is not open" });
        }

        // Mark as resolved
        await db
          .update(moneyAlerts)
          .set({
            status: "resolved",
            reasonResolved: `${reason}${note ? ": " + note : ""}`,
            resolvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(moneyAlerts.id, id));

        // Log event
        await db.insert(moneyAlertEvents).values({
          id: randomUUID(),
          alertId: id,
          userId,
          action: "RESOLVED",
          metadata: JSON.stringify({ reason, note }),
        } as any);

        res.json({
          success: true,
          message: "Alert marked as resolved",
        });
      } catch (error) {
        console.error("[Money Alerts] Error resolving alert:", error);
        res.status(500).json({ error: "Failed to resolve alert" });
      }
    }
  );

  /**
   * GET /api/money-alerts/summary
   * Get summary of unbilled amounts
   */
  app.get("/api/money-alerts/summary", authMiddleware, requirePaidPlan, async (req: any, res: Response) => {
    try {
      const userId = req.userId || (req as any).user?.id;
      const summary = await MoneyAlertsEngine.getAlertSummary(userId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error("[Money Alerts] Error getting summary:", error);
      res.status(500).json({ error: "Failed to get summary" });
    }
  });
}

