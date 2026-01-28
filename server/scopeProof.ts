import type { Express, Request, Response } from "express";
import { eq, and, gte, desc } from "drizzle-orm";
import { db } from "./db";
import { scopeProofs, scopeProofNotifications, users as usersTable } from "@shared/schema";
import { randomUUID } from "crypto";
import { sendEmail } from "./emailService";
import { requirePlan } from "./utils/subscriptionGuard";

/**
 * ✅ SCOPE PROOF & CLIENT APPROVAL ENGINE ROUTES
 * 
 * Revenue protection feature:
 * - Contractors capture extra work
 * - Get client approval via secure link (no login)
 * - Auto-convert to invoice line items
 * - 24-hour expiry with 12-hour reminder
 * 
 * 🔒 PLAN GATING: Professional & Enterprise only
 */

// Type for authenticated user
interface AuthenticatedRequest {
  user?: { id: string };
  subscription?: { plan: string };
  [key: string]: any;
}

export function registerScopeProofRoutes(app: Express) {
  /**
   * GET /api/scope-proof
   * List all scope proofs for authenticated contractor
   * 
   * 🔒 Requires: Professional or Enterprise plan
   * Query params: status (pending|approved|expired), projectId
   */
  app.get("/api/scope-proof", requirePlan("professional", "enterprise"), async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      // Build query
      const { status, projectId } = req.query;
      let conditions: any[] = [eq(scopeProofs.userId, userId)];

      if (status && typeof status === "string") {
        conditions.push(eq(scopeProofs.status, status));
      }

      if (projectId && typeof projectId === "string") {
        conditions.push(eq(scopeProofs.projectId, projectId));
      }

      const allProofs = await db
        .select()
        .from(scopeProofs)
        .where(and(...conditions))
        .orderBy(desc(scopeProofs.createdAt));

      return res.json(allProofs);
    } catch (error: any) {
      console.error("[ScopeProof] Error listing proofs:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to list scope proofs",
        details: error.message,
      });
    }
  });


  /**
   * POST /api/scope-proof
   * Create a new scope proof (manually by contractor)
   * 
   * 🔒 Requires: Professional or Enterprise plan
   * Body: { projectId?, description, estimatedCost, photos[] }
   */
  app.post("/api/scope-proof", requirePlan("professional", "enterprise"), async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const { projectId, description, estimatedCost, photos = [] } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!description || !estimatedCost) {
        return res.status(400).json({ error: "Description and estimatedCost required" });
      }
          code: "SUBSCRIPTION_REQUIRED",
        });
      }

      const approvalToken = randomUUID();
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const newScopeProof = await db
        .insert(scopeProofs)
        .values({
          userId,
          projectId: projectId || null,
          description,
          estimatedCost: estimatedCost.toString(),
          photos: JSON.stringify(photos),
          approvalToken,
          tokenExpiresAt,
          status: "pending",
        })
        .returning();

      console.log(`[ScopeProof] Created for user ${userId}: ${newScopeProof[0]?.id}`);

      return res.status(201).json({
        data: {
          ...newScopeProof[0],
          photos,
        },
      });
    } catch (error: any) {
      console.error("[ScopeProof] Create error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/scope-proof/:id/request
   * Request client approval for a scope proof
   * 
   * 🔒 Requires: Professional or Enterprise plan
   */
  app.post("/api/scope-proof/:id/request", requirePlan("professional", "enterprise"), async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { clientEmail } = req.body;

      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      if (!clientEmail) return res.status(400).json({ error: "clientEmail required" });

      // Verify proof exists and belongs to user
      const proof = await db
        .select()
        .from(scopeProofs)
        .where(and(eq(scopeProofs.id, id), eq(scopeProofs.userId, userId)))
        .limit(1);

      if (proof.length === 0) {
        return res.status(404).json({ error: "Scope proof not found" });
      }

      if (proof[0].status !== "pending") {
        return res.status(400).json({ error: "Can only request approval for pending proofs" });
      }

      const approvalUrl = `${process.env.FRONTEND_URL || "https://tellbill.app"}/approve/${proof[0].approvalToken}`;
      const contractor = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      const contractorName = contractor[0]?.companyName || contractor[0]?.name || "Contractor";

      // Send email to client
      await sendEmail({
        to: clientEmail,
        subject: "Please confirm today's work",
        html: `
          <p>Hi,</p>
          <p>We completed additional work on your project today.</p>
          <p><a href="${approvalUrl}" style="background: #D4AF37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Review & Confirm Work</a></p>
          <p>Thank you,<br>${contractorName}</p>
        `,
      });

      // Record notification
      await db.insert(scopeProofNotifications).values({
        scopeProofId: id,
        notificationType: "initial",
        sentVia: "email",
      });

      console.log(`[ScopeProof] Approval requested for ${id}`);

      return res.json({ success: true, message: "Approval request sent" });
    } catch (error: any) {
      console.error("[ScopeProof] Request error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/scope-proof/approve/:token
   * CLIENT ENDPOINT (no auth required)
   */
  app.post("/api/scope-proof/approve/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { clientEmail } = req.body;

      if (!token || !clientEmail) {
        return res.status(400).json({ error: "Token and clientEmail required" });
      }

      const proof = await db
        .select()
        .from(scopeProofs)
        .where(eq(scopeProofs.approvalToken, token as string))
        .limit(1);

      if (proof.length === 0) {
        return res.status(404).json({ error: "Invalid approval link" });
      }

      const scopeProof = proof[0];

      // Validate token not expired
      if (scopeProof.tokenExpiresAt && new Date() > scopeProof.tokenExpiresAt) {
        return res.status(400).json({ error: "Approval link expired" });
      }

      // Validate status is pending
      if (scopeProof.status !== "pending") {
        return res.status(400).json({ error: "Approval already processed" });
      }

      // Update scope proof
      await db
        .update(scopeProofs)
        .set({
          status: "approved",
          approvedAt: new Date(),
          approvedBy: clientEmail,
        })
        .where(eq(scopeProofs.id, scopeProof.id));

      console.log(`[ScopeProof] Approved: ${scopeProof.id}`);

      return res.json({
        success: true,
        message: "Work confirmed and added to invoice",
      });
    } catch (error: any) {
      console.error("[ScopeProof] Approve error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/scope-proof/:id/resend
   * Resend approval request to client
   * 
   * 🔒 Requires: Professional or Enterprise plan
   */
  app.post("/api/scope-proof/:id/resend", requirePlan("professional", "enterprise"), async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { clientEmail } = req.body;

      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      if (!clientEmail) return res.status(400).json({ error: "clientEmail required" });

      const proof = await db
        .select()
        .from(scopeProofs)
        .where(and(eq(scopeProofs.id, id), eq(scopeProofs.userId, userId)))
        .limit(1);

      if (proof.length === 0) {
        return res.status(404).json({ error: "Scope proof not found" });
      }

      if (proof[0].tokenExpiresAt && new Date() > proof[0].tokenExpiresAt) {
        return res.status(400).json({ error: "Approval link expired" });
      }

      // Resend email
      const approvalUrl = `${process.env.FRONTEND_URL || "https://tellbill.app"}/approve/${proof[0].approvalToken}`;
      const contractor = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      const contractorName = contractor[0]?.companyName || contractor[0]?.name || "Contractor";

      await sendEmail({
        to: clientEmail,
        subject: "Reminder: Please confirm today's work",
        html: `
          <p>Hi,</p>
          <p>Friendly reminder to confirm the additional work we completed on your project.</p>
          <p><a href="${approvalUrl}" style="background: #D4AF37; color: white; padding: 12px 24px; text-decoration: none;">Review & Confirm Work</a></p>
          <p>Thank you,<br>${contractorName}</p>
        `,
      });

      console.log(`[ScopeProof] Resent approval for ${id}`);

      return res.json({ success: true, message: "Reminder sent" });
    } catch (error: any) {
      console.error("[ScopeProof] Resend error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/scope-proof/:id
   * Cancel approval request
   * 
   * 🔒 Requires: Professional or Enterprise plan
   */
  app.delete("/api/scope-proof/:id", requirePlan("professional", "enterprise"), async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const proof = await db
        .select()
        .from(scopeProofs)
        .where(and(eq(scopeProofs.id, id), eq(scopeProofs.userId, userId)))
        .limit(1);

      if (proof.length === 0) {
        return res.status(404).json({ error: "Scope proof not found" });
      }

      if (proof[0].status !== "pending") {
        return res.status(400).json({ error: "Can only cancel pending approvals" });
      }

      await db.delete(scopeProofs).where(eq(scopeProofs.id, id));

      console.log(`[ScopeProof] Cancelled: ${id}`);

      return res.json({ success: true, message: "Approval cancelled" });
    } catch (error: any) {
      console.error("[ScopeProof] Delete error:", error);
      return res.status(500).json({ error: error.message });
    }
  });
}
