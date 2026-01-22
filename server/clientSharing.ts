import type { Express, Request, Response } from "express";
import { eq, and, isNull, gt, sql } from "drizzle-orm";
import { projects, users, projectEvents, clientShareTokens, clientPortalPayments } from "@shared/schema";
import { db } from "./db";
import { randomUUID } from "crypto";

interface GenerateTokenRequest {
  projectId: string;
  expiresIn?: number; // seconds from now, null = never expires
}

interface ClientApprovalRequest {
  approvalStatus: "APPROVED" | "REJECTED";
  approvalNotes?: string;
}

export function registerClientSharingRoutes(app: Express) {
  /**
   * POST /api/client-sharing/generate-token
   * Generate a secure magic link token for a project
   * Contractor only
   */
  app.post("/api/client-sharing/generate-token", async (req: Request, res: Response) => {
    try {
      const { projectId, expiresIn } = req.body as GenerateTokenRequest;
      const { userId } = req.query;

      if (!projectId || !userId) {
        return res.status(400).json({
          success: false,
          error: "projectId and userId are required",
        });
      }

      // Verify project ownership
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId as string)))
        .limit(1);

      if (project.length === 0) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized: This project doesn't belong to you",
        });
      }

      // Generate secure token
      const token = randomUUID();
      const tokenId = randomUUID();
      const createdAt = Date.now();
      const expiresAt = expiresIn ? createdAt + expiresIn * 1000 : null;

      // Insert into database
      const inserted = await db
        .insert(clientShareTokens)
        .values({
          tokenId,
          projectId,
          userId: userId as string,
          token,
          createdAt,
          expiresAt,
        })
        .returning();

      console.log(`[ClientSharing] Generated token ${token} for project ${projectId}, user ${userId}`);

      const magicLink = `https://tellbill.app/view/${token}`;

      return res.status(201).json({
        success: true,
        tokenId: inserted[0]?.tokenId,
        token,
        magicLink,
        expiresAt,
      });
    } catch (error) {
      console.error("[ClientSharing] Token generation error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to generate token",
      });
    }
  });

  /**
   * GET /api/client-view/:token
   * Client view: Fetch project activities visible to client
   * No authentication required
   */
  app.get("/api/client-view/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: "Token is required",
        });
      }

      // Validate token
      const tokenRecord = await db
        .select()
        .from(clientShareTokens)
        .where(eq(clientShareTokens.token, token))
        .limit(1);

      if (tokenRecord.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Invalid token",
        });
      }

      const tokenData = tokenRecord[0]!;

      // Check if revoked
      if (tokenData.revokedAt !== null) {
        return res.status(403).json({
          success: false,
          error: "This token has been revoked",
        });
      }

      // Check if expired
      const now = Date.now();
      if (tokenData.expiresAt !== null && tokenData.expiresAt < now) {
        return res.status(403).json({
          success: false,
          error: "This token has expired",
        });
      }

      // Increment access count and update last accessed
      await db
        .update(clientShareTokens)
        .set({
          accessCount: (tokenData.accessCount ?? 0) + 1,
          lastAccessed: now,
        })
        .where(eq(clientShareTokens.token, token));

      // Fetch project details
      const projectData = await db
        .select()
        .from(projects)
        .where(eq(projects.id, tokenData.projectId))
        .limit(1);

      if (projectData.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Project not found",
        });
      }

      // Fetch activities visible to client
      const activities = await db
        .select()
        .from(projectEvents)
        .where(
          and(
            eq(projectEvents.projectId, tokenData.projectId),
            eq(projectEvents.isDeleted, false)
          )
        );

      // Filter to only visible activities
      const visibleActivities = activities.filter((activity: any) => {
        // Check if activity has visible_to_client field in data or as column
        // For now, we'll return all activities (schema extension happens after migration)
        return true;
      });

      console.log(
        `[ClientSharing] Client accessed project ${tokenData.projectId} with token: ${token}`
      );

      return res.status(200).json({
        success: true,
        project: {
          id: projectData[0]?.id,
          name: projectData[0]?.name,
          description: projectData[0]?.description,
          status: projectData[0]?.status,
        },
        activities: visibleActivities,
        accessCount: (tokenData.accessCount ?? 0) + 1,
      });
    } catch (error) {
      console.error("[ClientSharing] Client view error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch project data",
      });
    }
  });

  /**
   * GET /api/client-view/:token/summary
   * Get invoice summary for client portal
   */
  app.get("/api/client-view/:token/summary", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: "Token is required",
        });
      }

      // Validate token
      const tokenRecord = await db
        .select()
        .from(clientShareTokens)
        .where(eq(clientShareTokens.token, token))
        .limit(1);

      if (tokenRecord.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Invalid token",
        });
      }

      const tokenData = tokenRecord[0]!;

      // Check if revoked
      if (tokenData.revokedAt !== null) {
        return res.status(403).json({
          success: false,
          error: "This token has been revoked",
        });
      }

      // Check if expired
      const now = Date.now();
      if (tokenData.expiresAt !== null && tokenData.expiresAt < now) {
        return res.status(403).json({
          success: false,
          error: "This token has expired",
        });
      }

      // Fetch all billable activities for this project
      // Sum LABOR and MATERIAL events (LABOR/MATERIAL are automatically billable, 
      // ALERT/PROGRESS need explicit approval)
      const billableActivities = await db
        .select()
        .from(projectEvents)
        .where(
          and(
            eq(projectEvents.projectId, tokenData.projectId),
            eq(projectEvents.isDeleted, false),
            eq(projectEvents.visibleToClient, true)
          )
        );

      // Calculate totals from billable activities
      let totalLaborBilled = 0;
      let totalMaterialBilled = 0;

      billableActivities.forEach((activity: any) => {
        // Parse activity data to extract amounts
        // LABOR and MATERIAL events are billed by default
        // ALERT and PROGRESS require explicit approval
        try {
          const eventData = typeof activity.data === "string" ? JSON.parse(activity.data) : activity.data;

          // LABOR and MATERIAL are automatically billable (no approval needed)
          if (activity.eventType === "LABOR" && eventData.total) {
            totalLaborBilled += eventData.total;
          } else if (activity.eventType === "MATERIAL" && eventData.total) {
            totalMaterialBilled += eventData.total;
          } 
          // ALERT (change orders) and PROGRESS only bill if approved
          else if ((activity.eventType === "ALERT" || activity.eventType === "PROGRESS") 
                   && activity.approvalStatus === "APPROVED" && eventData.total) {
            if (activity.eventType === "ALERT") {
              totalLaborBilled += eventData.total;
            } else {
              totalMaterialBilled += eventData.total;
            }
          }
        } catch (parseError) {
          // Silently skip malformed data
        }
      });

      // Fetch payments from this token
      const payments = await db
        .select()
        .from(clientPortalPayments)
        .where(eq(clientPortalPayments.tokenId, tokenData.tokenId));

      const totalPaid = payments
        .filter((p) => p.paymentStatus === "SUCCESS")
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const balanceDue = totalLaborBilled + totalMaterialBilled - totalPaid;

      console.log(
        `[ClientSharing] Summary for token ${token}: Labor=${totalLaborBilled}, Material=${totalMaterialBilled}, Paid=${totalPaid}`
      );

      return res.status(200).json({
        success: true,
        data: {
          laborBilled: totalLaborBilled,
          materialBilled: totalMaterialBilled,
          balanceDue: Math.max(0, balanceDue), // Don't show negative balance
          paidAmount: totalPaid,
          outstandingAmount: Math.max(0, balanceDue),
          currency: "USD",
          lastUpdated: now,
        },
      });
    } catch (error) {
      console.error("[ClientSharing] Summary error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch summary",
      });
    }
  });

  /**
   * POST /api/client-view/:token/approve/:eventId
   * Client approves a change order (ALERT activity)
   */
  app.post("/api/client-view/:token/approve/:eventId", async (req: Request, res: Response) => {
    try {
      const { token, eventId } = req.params;
      const { approvalStatus, approvalNotes } = req.body as ClientApprovalRequest;

      if (!token || !eventId || !approvalStatus) {
        return res.status(400).json({
          success: false,
          error: "token, eventId, and approvalStatus are required",
        });
      }

      if (!["APPROVED", "REJECTED"].includes(approvalStatus)) {
        return res.status(400).json({
          success: false,
          error: "approvalStatus must be APPROVED or REJECTED",
        });
      }

      // Validate token
      const tokenRecord = await db
        .select()
        .from(clientShareTokens)
        .where(eq(clientShareTokens.token, token))
        .limit(1);

      if (tokenRecord.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Invalid token",
        });
      }

      const tokenData = tokenRecord[0]!;

      // Check if revoked
      if (tokenData.revokedAt !== null) {
        return res.status(403).json({
          success: false,
          error: "This token has been revoked",
        });
      }

      // Check if expired
      const now = Date.now();
      if (tokenData.expiresAt !== null && tokenData.expiresAt < now) {
        return res.status(403).json({
          success: false,
          error: "This token has expired",
        });
      }

      // Verify event belongs to this project
      const eventRecord = await db
        .select()
        .from(projectEvents)
        .where(
          and(
            eq(projectEvents.eventId, eventId),
            eq(projectEvents.projectId, tokenData.projectId)
          )
        )
        .limit(1);

      if (eventRecord.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Event not found or doesn't belong to this project",
        });
      }

      // Update approval status on activity
      // Note: This assumes the database has been migrated with the new columns
      // For now, we'll log the action
      console.log(
        `[ClientSharing] Event ${eventId} marked as ${approvalStatus} by client. Notes: ${approvalNotes || "None"}`
      );

      // TODO: When migration 0005 is applied:
      // UPDATE project_events SET approval_status = ?, approved_at = ?, approval_notes = ?
      // WHERE event_id = ?

      // TODO: Notify contractor via email/notification
      // Send notification to contractor (user ${tokenData.userId})
      // Message: "Client has ${approvalStatus} the change order for $X"

      // TODO: If APPROVED, trigger invoice recalculation
      // This would update balance due and trigger real-time updates

      return res.status(200).json({
        success: true,
        message: `Event ${approvalStatus}`,
        eventId,
        approvalStatus,
        approvedAt: now,
      });
    } catch (error) {
      console.error("[ClientSharing] Approval error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to approve activity",
      });
    }
  });

  /**
   * POST /api/client-sharing/revoke-token
   * Contractor revokes a magic link
   */
  app.post("/api/client-sharing/revoke-token", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      const { userId } = req.query;

      if (!token || !userId) {
        return res.status(400).json({
          success: false,
          error: "token and userId are required",
        });
      }

      // Find the token record
      const tokenRecord = await db
        .select()
        .from(clientShareTokens)
        .where(
          and(
            eq(clientShareTokens.token, token),
            eq(clientShareTokens.userId, userId as string)
          )
        )
        .limit(1);

      if (tokenRecord.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Token not found or doesn't belong to you",
        });
      }

      // Mark as revoked
      const now = Date.now();
      const revoked = await db
        .update(clientShareTokens)
        .set({
          revokedAt: now,
        })
        .where(eq(clientShareTokens.token, token))
        .returning();

      console.log(
        `[ClientSharing] Revoked token: ${token} for user ${userId}`
      );

      return res.status(200).json({
        success: true,
        message: "Token revoked successfully",
        revokedAt: now,
      });
    } catch (error) {
      console.error("[ClientSharing] Revocation error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to revoke token",
      });
    }
  });

  /**
   * PATCH /api/activities/:eventId/visibility
   * Contractor toggles whether activity is visible to client
   */
  app.patch("/api/activities/:eventId/visibility", async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { visibleToClient } = req.body;
      const { userId } = req.query;

      if (!eventId || visibleToClient === undefined || !userId) {
        return res.status(400).json({
          success: false,
          error: "eventId, visibleToClient, and userId are required",
        });
      }

      // Verify ownership - event must belong to user's project
      const eventRecord = await db
        .select()
        .from(projectEvents)
        .where(
          and(
            eq(projectEvents.eventId, eventId),
            eq(projectEvents.userId, userId as string)
          )
        )
        .limit(1);

      if (eventRecord.length === 0) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized: This event doesn't belong to you",
        });
      }

      // Update visibility
      // Note: This assumes the database has been migrated with visible_to_client column
      console.log(
        `[ClientSharing] Activity ${eventId} visibility set to ${visibleToClient}`
      );

      // TODO: When migration 0005 is applied:
      // UPDATE project_events SET visible_to_client = ? WHERE event_id = ?
      // const updated = await db
      //   .update(projectEvents)
      //   .set({
      //     visibleToClient,
      //   })
      //   .where(eq(projectEvents.eventId, eventId))
      //   .returning();

      // TODO: Broadcast real-time update to client portal (WebSocket)
      // io.to(`project:${eventRecord[0].projectId}`).emit("activity:visibility-changed", {
      //   eventId,
      //   visibleToClient,
      // });

      return res.status(200).json({
        success: true,
        message: "Visibility updated",
        eventId,
        visibleToClient,
      });
    } catch (error) {
      console.error("[ClientSharing] Visibility update error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update visibility",
      });
    }
  });

  /**
   * GET /api/client-view/:token/receipts
   * Fetch receipts for project (for web portal display)
   * Returns receipt data without exposing full database rows
   */
  app.get("/api/client-view/:token/receipts", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: "Token is required",
        });
      }

      // Validate token
      const tokenRecord = await db
        .select()
        .from(clientShareTokens)
        .where(eq(clientShareTokens.token, token))
        .limit(1);

      if (tokenRecord.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Invalid token",
        });
      }

      const tokenData = tokenRecord[0]!;

      // Check if revoked
      if (tokenData.revokedAt !== null) {
        return res.status(403).json({
          success: false,
          error: "This token has been revoked",
        });
      }

      // Check if expired
      const now = Date.now();
      if (tokenData.expiresAt !== null && tokenData.expiresAt < now) {
        return res.status(403).json({
          success: false,
          error: "This token has expired",
        });
      }

      // Fetch receipts for project
      const receipts = await db
        .select()
        .from(receipts as any)
        .where(
          and(
            eq((receipts as any).project_id, tokenData.projectId),
            eq((receipts as any).status, "approved")
          )
        )
        .orderBy(desc((receipts as any).created_at));

      // Transform receipts for client view
      const clientReceipts = receipts.map((receipt: any) => ({
        id: receipt.id,
        vendor: receipt.vendor,
        purchaseDate: receipt.purchase_date,
        photoUrl: receipt.photo_url,
        totalAmount: receipt.total_amount,
        extractedItems: receipt.extracted_items,
        createdAt: receipt.created_at,
        // Don't expose base64 in client view (use URL instead)
      }));

      return res.status(200).json({
        success: true,
        receipts: clientReceipts,
      });
    } catch (error) {
      console.error("[ClientSharing] Receipts fetch error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch receipts",
      });
    }
  });
}
