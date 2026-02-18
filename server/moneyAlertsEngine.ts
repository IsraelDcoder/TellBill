import { db } from "./db";
import { moneyAlerts, moneyAlertEvents, receipts, invoices, scopeProofs, projectEvents, users, projects } from "../shared/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { randomUUID } from "crypto";

interface MoneyAlertInput {
  userId: string;
  type: "RECEIPT_UNBILLED" | "SCOPE_APPROVED_NO_INVOICE" | "VOICE_LOG_NO_INVOICE" | "INVOICE_NOT_SENT";
  sourceType: "RECEIPT" | "SCOPE" | "TRANSCRIPT" | "INVOICE";
  sourceId: string;
  clientName?: string;
  clientEmail?: string;
  estimatedAmount?: string;
  currency?: string;
  confidence?: number;
}

/**
 * MoneyAlertsEngine - Detects unbilled work and creates money alerts
 * Runs ONLY for paid users (Solo+)
 */
export class MoneyAlertsEngine {
  /**
   * Check if user is on a paid plan
   */
  static async isPaidUser(userId: string): Promise<boolean> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) return false;

      const paidPlans = ["solo", "professional"];
      return paidPlans.includes(user.currentPlan?.toLowerCase() || "");
    } catch (error) {
      console.error("[MoneyAlertsEngine] Error checking plan:", error);
      return false;
    }
  }

  /**
   * Process event and potentially create alert
   * Called after: receipt scanned, scope approved, transcript extracted, invoice created/sent
   */
  static async processEvent(
    userId: string,
    eventType: "RECEIPT_CREATED" | "SCOPE_APPROVED" | "TRANSCRIPT_EXTRACTED" | "INVOICE_CREATED" | "INVOICE_SENT",
    sourceId: string
  ): Promise<void> {
    // Check if user is paid
    const isPaid = await this.isPaidUser(userId);
    if (!isPaid) {
      console.log(`[MoneyAlertsEngine] User ${userId} is free tier, skipping alert generation`);
      return;
    }

    try {
      switch (eventType) {
        case "RECEIPT_CREATED":
          await this.detectUnbilledReceipt(userId, sourceId);
          break;
        case "SCOPE_APPROVED":
          await this.detectApprovedScopeNoInvoice(userId, sourceId);
          break;
        case "TRANSCRIPT_EXTRACTED":
          await this.detectVoiceLogNoInvoice(userId, sourceId);
          break;
        case "INVOICE_CREATED":
          // Will be handled by scheduled job
          break;
        case "INVOICE_SENT":
          // Mark any INVOICE_NOT_SENT alerts as FIXED
          await this.closeInvoiceSentAlerts(userId, sourceId);
          break;
      }
    } catch (error) {
      console.error(`[MoneyAlertsEngine] Error processing ${eventType}:`, error);
    }
  }

  /**
   * A) Receipt scanned but not linked to invoice
   */
  static async detectUnbilledReceipt(userId: string, receiptId: string): Promise<void> {
    try {
      const receipt = await db.query.receipts.findFirst({
        where: eq(receipts.id, receiptId),
      });

      if (!receipt) {
        console.log(`[MoneyAlertsEngine] Receipt ${receiptId} not found`);
        return;
      }

      // If already linked to invoice, skip
      if (receipt.linkedInvoiceId) {
        console.log(`[MoneyAlertsEngine] Receipt ${receiptId} already linked to invoice`);
        return;
      }

      // Check for duplicate alert
      const existing = await db.query.moneyAlerts.findFirst({
        where: and(
          eq(moneyAlerts.userId, userId),
          eq(moneyAlerts.type, "RECEIPT_UNBILLED"),
          eq(moneyAlerts.sourceId, receiptId),
          eq(moneyAlerts.status, "open")
        ),
      });

      if (existing) {
        console.log(`[MoneyAlertsEngine] Alert already exists for receipt ${receiptId}`);
        return;
      }

      // Create alert
      const alertId = randomUUID();
      await db.insert(moneyAlerts).values({
        id: alertId,
        userId,
        type: "RECEIPT_UNBILLED",
        status: "open",
        sourceType: "RECEIPT",
        sourceId: receiptId,
        clientName: receipt.clientName,
        clientEmail: receipt.clientEmail,
        estimatedAmount: receipt.totalAmount,
        currency: receipt.currency || "USD",
        confidence: 90, // High confidence: receipt exists but not billed
      } as any);

      console.log(`[MoneyAlertsEngine] Created RECEIPT_UNBILLED alert for ${receiptId}`);

      // Log event
      await db.insert(moneyAlertEvents).values({
        id: randomUUID(),
        alertId: alertId,
        userId,
        action: "CREATED",
        metadata: JSON.stringify({ receiptId }),
      } as any);
    } catch (error) {
      console.error(`[MoneyAlertsEngine] Error in detectUnbilledReceipt:`, error);
    }
  }

  /**
   * B) Scope approved but no invoice exists
   */
  static async detectApprovedScopeNoInvoice(userId: string, scopeId: string): Promise<void> {
    try {
      const scope = await db.query.scopeProofs.findFirst({
        where: eq(scopeProofs.id, scopeId),
      });

      if (!scope || scope.status !== "approved") {
        console.log(`[MoneyAlertsEngine] Scope ${scopeId} not approved`);
        return;
      }

      // Check for invoices linked to this scope project
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, scope.projectId || ""),
      });

      const recentInvoice = project ? await db.query.invoices.findFirst({
        where: and(
          eq(invoices.userId, userId),
          eq(invoices.projectId, project.id)
        ),
      }) : null;

      if (recentInvoice) {
        console.log(`[MoneyAlertsEngine] Invoice exists for scope ${scopeId}`);
        return;
      }

      // Check for duplicate alert
      const existing = await db.query.moneyAlerts.findFirst({
        where: and(
          eq(moneyAlerts.userId, userId),
          eq(moneyAlerts.type, "SCOPE_APPROVED_NO_INVOICE"),
          eq(moneyAlerts.sourceId, scopeId),
          eq(moneyAlerts.status, "open")
        ),
      });

      if (existing) {
        console.log(`[MoneyAlertsEngine] Alert already exists for scope ${scopeId}`);
        return;
      }

      // Create alert
      await db.insert(moneyAlerts).values({
        id: randomUUID(),
        userId,
        type: "SCOPE_APPROVED_NO_INVOICE",
        status: "open",
        sourceType: "SCOPE",
        sourceId: scopeId,
        clientName: project?.clientName,
        clientEmail: undefined,
        estimatedAmount: scope.estimatedCost,
        currency: "USD",
        confidence: 85, // High confidence: scope approved but no invoice
      });

      console.log(`[MoneyAlertsEngine] Created SCOPE_APPROVED_NO_INVOICE alert for ${scopeId}`);
    } catch (error) {
      console.error(`[MoneyAlertsEngine] Error in detectApprovedScopeNoInvoice:`, error);
    }
  }

  /**
   * C) Voice log transcript exists but no invoice
   * Note: Transcripts are stored in projectEvents table, not separate transcriptions table
   */
  static async detectVoiceLogNoInvoice(userId: string, eventId: string): Promise<void> {
    try {
      const event = await db.query.projectEvents.findFirst({
        where: eq(projectEvents.eventId, eventId),
      });

      if (!event) {
        console.log(`[MoneyAlertsEngine] Event ${eventId} not found`);
        return;
      }

      // Only create alert for VOICE events with transcripts
      if (event.source !== "VOICE" || !event.transcript) {
        console.log(`[MoneyAlertsEngine] Event ${eventId} is not a voice transcript`);
        return;
      }

      // Check for duplicate alert
      const existing = await db.query.moneyAlerts.findFirst({
        where: and(
          eq(moneyAlerts.userId, userId),
          eq(moneyAlerts.type, "VOICE_LOG_NO_INVOICE"),
          eq(moneyAlerts.sourceId, eventId),
          eq(moneyAlerts.status, "open")
        ),
      });

      if (existing) {
        console.log(`[MoneyAlertsEngine] Alert already exists for event ${eventId}`);
        return;
      }

      // Create alert
      await db.insert(moneyAlerts).values({
        id: randomUUID(),
        userId,
        type: "VOICE_LOG_NO_INVOICE",
        status: "open",
        sourceType: "TRANSCRIPT",
        sourceId: eventId,
        confidence: 75, // Medium confidence: transcript exists but may not be billable
      } as any);

      console.log(`[MoneyAlertsEngine] Created VOICE_LOG_NO_INVOICE alert for ${eventId}`);
    } catch (error) {
      console.error(`[MoneyAlertsEngine] Error in detectVoiceLogNoInvoice:`, error);
    }
  }

  /**
   * D) Invoice sent - close any INVOICE_NOT_SENT alerts
   */
  static async closeInvoiceSentAlerts(userId: string, invoiceId: string): Promise<void> {
    try {
      const alertToClose = await db.query.moneyAlerts.findFirst({
        where: and(
          eq(moneyAlerts.userId, userId),
          eq(moneyAlerts.type, "INVOICE_NOT_SENT"),
          eq(moneyAlerts.sourceId, invoiceId)
        ),
      });

      if (alertToClose) {
        await db
          .update(moneyAlerts)
          .set({
            status: "fixed",
            updatedAt: new Date(),
          })
          .where(eq(moneyAlerts.id, alertToClose.id));

        console.log(`[MoneyAlertsEngine] Closed INVOICE_NOT_SENT alert ${alertToClose.id}`);
      }
    } catch (error) {
      console.error(`[MoneyAlertsEngine] Error in closeInvoiceSentAlerts:`, error);
    }
  }

  /**
   * Scheduled job: Find draft invoices not sent for 24h and create alerts
   */
  static async detectDraftInvoicesNotSent(): Promise<void> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const draftInvoices = await db.query.invoices.findMany({
        where: and(
          eq(invoices.status, "draft"),
          gt(invoices.createdAt, twentyFourHoursAgo)
        ),
      });

      for (const invoice of draftInvoices) {
        // Skip if userId is null
        if (!invoice.userId) continue;

        // Check if alert already exists
        const existing = await db.query.moneyAlerts.findFirst({
          where: and(
            eq(moneyAlerts.userId, invoice.userId),
            eq(moneyAlerts.type, "INVOICE_NOT_SENT"),
            eq(moneyAlerts.sourceId, invoice.id),
            eq(moneyAlerts.status, "open")
          ),
        });

        if (!existing) {
          // Check if user is paid
          const isPaid = await this.isPaidUser(invoice.userId);
          if (isPaid) {
            const project = invoice.projectId ? await db.query.projects.findFirst({
              where: eq(projects.id, invoice.projectId),
            }) : null;

            await db.insert(moneyAlerts).values({
              id: randomUUID(),
              userId: invoice.userId,
              type: "INVOICE_NOT_SENT",
              status: "open",
              sourceType: "INVOICE",
              sourceId: invoice.id,
              clientName: project?.clientName,
              clientEmail: undefined,
              estimatedAmount: invoice.total,
              currency: "USD",
              confidence: 80,
            });

            console.log(
              `[MoneyAlertsEngine] Created INVOICE_NOT_SENT alert for invoice ${invoice.id}`
            );
          }
        }
      }
    } catch (error) {
      console.error(`[MoneyAlertsEngine] Error in detectDraftInvoicesNotSent:`, error);
    }
  }

  /**
   * Get all open alerts for user
   */
  static async getOpenAlerts(userId: string): Promise<any[]> {
    try {
      const alerts = await db
        .select()
        .from(moneyAlerts)
        .where(
          and(
            eq(moneyAlerts.userId, userId),
            eq(moneyAlerts.status, "open")
          )
        )
        .orderBy((a) => a.createdAt);

      return alerts || [];
    } catch (error) {
      console.error(`[MoneyAlertsEngine] Error fetching alerts:`, error);
      return [];
    }
  }

  /**
   * Get alert summary for user
   */
  static async getAlertSummary(userId: string): Promise<{ count: number; totalAmount: string }> {
    try {
      const alerts = await this.getOpenAlerts(userId);
      const count = alerts.length;
      const totalAmount = alerts
        .reduce((sum, alert) => sum + (parseFloat(alert.estimatedAmount || "0") || 0), 0)
        .toFixed(2);

      return { count, totalAmount };
    } catch (error) {
      console.error(`[MoneyAlertsEngine] Error getting summary:`, error);
      return { count: 0, totalAmount: "0" };
    }
  }
}
