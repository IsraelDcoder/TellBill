/**
 * Money Alerts System
 * 
 * Tracks unbilled material costs and alerts contractors
 * when they have money sitting on the table
 */

import type { Express, Request, Response } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { receipts } from "@shared/schema";
import { db } from "./db";
import { authMiddleware } from "./utils/authMiddleware";

/**
 * Check for unbilled material costs
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
 * Calculate total unbilled material amount
 */
export async function getTotalUnbilledAmount(userId: string): Promise<string> {
  const unbilled = await getUnbilledMaterials(userId);
  const total = unbilled.reduce((sum, receipt) => {
    return sum + parseFloat(receipt.totalAmount as unknown as string);
  }, 0);
  return total.toFixed(2);
}

/**
 * Money Alert: Structure for returning to frontend
 */
export interface MoneyAlert {
  type: "unbilled_materials";
  severity: "warning" | "critical";
  title: string;
  description: string;
  amount: string;
  count: number;
  actionCta: string;
  receipts: Array<{
    id: string;
    vendor: string;
    amount: string;
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

  const severity = total > 500 ? "critical" : "warning";

  return {
    type: "unbilled_materials",
    severity,
    title: `$${total.toFixed(2)} in Unbilled Materials`,
    description: `You have ${unbilled.length} material receipt${unbilled.length !== 1 ? "s" : ""} ready to bill to clients.`,
    amount: total.toFixed(2),
    count: unbilled.length,
    actionCta: "Attach to Invoice",
    receipts: unbilled.map((r) => ({
      id: r.id,
      vendor: r.vendor,
      amount: r.totalAmount as any as string,
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
   * Get active money alerts for user
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
   * Get detailed list of unbilled materials
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
              amount: r.totalAmount,
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
}
