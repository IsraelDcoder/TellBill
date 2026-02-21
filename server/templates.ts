import type { Express, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { customInvoiceTemplates } from "@shared/schema";
import { authMiddleware } from "./utils/authMiddleware";

/**
 * Register custom invoice template routes
 * Endpoints for professional users to customize invoice templates
 */
export function registerTemplateRoutes(app: Express) {
  /**
   * GET /api/templates
   * Fetch user's custom templates (defaults + per-client)
   */
  app.get("/api/templates", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      const userTemplates = await db
        .select()
        .from(customInvoiceTemplates)
        .where(eq(customInvoiceTemplates.userId, userId));

      return res.json({
        success: true,
        templates: userTemplates,
      });
    } catch (error) {
      console.error("[Templates] Error fetching templates:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch templates",
      });
    }
  });

  /**
   * GET /api/templates/:id
   * Fetch a specific template
   */
  app.get("/api/templates/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const templateId = req.params.id;

      const template = await db
        .select()
        .from(customInvoiceTemplates)
        .where(
          and(
            eq(customInvoiceTemplates.id, templateId),
            eq(customInvoiceTemplates.userId, userId)
          )
        )
        .limit(1);

      if (!template || template.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Template not found",
        });
      }

      return res.json({
        success: true,
        template: template[0],
      });
    } catch (error) {
      console.error("[Templates] Error fetching template:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch template",
      });
    }
  });

  /**
   * POST /api/templates
   * Create a new custom template
   */
  app.post("/api/templates", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const {
        clientId,
        clientEmail,
        name,
        baseTemplate,
        primaryColor,
        accentColor,
        backgroundColor,
        textColor,
        logoUrl,
        companyHeaderText,
        footerText,
        showProjectName,
        showPoNumber,
        showWorkOrderNumber,
        customField1Name,
        customField1Value,
        customField2Name,
        customField2Value,
        fontFamily,
      } = req.body;

      if (!name || !baseTemplate) {
        return res.status(400).json({
          success: false,
          error: "Template name and base template are required",
        });
      }

      const newTemplate = await db
        .insert(customInvoiceTemplates)
        .values({
          userId,
          clientId: clientId || null,
          clientEmail: clientEmail || null,
          name,
          baseTemplate,
          primaryColor: primaryColor || "#667eea",
          accentColor: accentColor || "#764ba2",
          backgroundColor: backgroundColor || "#ffffff",
          textColor: textColor || "#333333",
          logoUrl: logoUrl || null,
          companyHeaderText: companyHeaderText || null,
          footerText: footerText || null,
          showProjectName: showProjectName ?? false,
          showPoNumber: showPoNumber ?? false,
          showWorkOrderNumber: showWorkOrderNumber ?? false,
          customField1Name: customField1Name || null,
          customField1Value: customField1Value || null,
          customField2Name: customField2Name || null,
          customField2Value: customField2Value || null,
          fontFamily: fontFamily || "system",
        })
        .returning();

      console.log("[Templates] ✅ Template created:", name);

      return res.status(201).json({
        success: true,
        template: newTemplate[0],
      });
    } catch (error) {
      console.error("[Templates] Error creating template:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create template",
      });
    }
  });

  /**
   * PATCH /api/templates/:id
   * Update a custom template
   */
  app.patch("/api/templates/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const templateId = req.params.id;

      // Verify ownership
      const template = await db
        .select()
        .from(customInvoiceTemplates)
        .where(
          and(
            eq(customInvoiceTemplates.id, templateId),
            eq(customInvoiceTemplates.userId, userId)
          )
        )
        .limit(1);

      if (!template || template.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Template not found",
        });
      }

      const updated = await db
        .update(customInvoiceTemplates)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(customInvoiceTemplates.id, templateId))
        .returning();

      console.log("[Templates] ✅ Template updated:", templateId);

      return res.json({
        success: true,
        template: updated[0],
      });
    } catch (error) {
      console.error("[Templates] Error updating template:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update template",
      });
    }
  });

  /**
   * DELETE /api/templates/:id
   * Delete a custom template
   */
  app.delete("/api/templates/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const templateId = req.params.id;

      // Verify ownership
      const template = await db
        .select()
        .from(customInvoiceTemplates)
        .where(
          and(
            eq(customInvoiceTemplates.id, templateId),
            eq(customInvoiceTemplates.userId, userId)
          )
        )
        .limit(1);

      if (!template || template.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Template not found",
        });
      }

      await db.delete(customInvoiceTemplates).where(eq(customInvoiceTemplates.id, templateId));

      console.log("[Templates] ✅ Template deleted:", templateId);

      return res.json({
        success: true,
        message: "Template deleted",
      });
    } catch (error) {
      console.error("[Templates] Error deleting template:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to delete template",
      });
    }
  });

  /**
   * GET /api/templates/client/:clientEmail
   * Get template for a specific client (or user's default)
   */
  app.get(
    "/api/templates/client/:clientEmail",
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user?.id;
        const clientEmail = req.params.clientEmail.toLowerCase();

        // Try to find client-specific template
        const clientSpecificTemplate = await db
          .select()
          .from(customInvoiceTemplates)
          .where(
            and(
              eq(customInvoiceTemplates.userId, userId),
              eq(customInvoiceTemplates.clientEmail, clientEmail)
            )
          )
          .limit(1);

        if (clientSpecificTemplate.length > 0) {
          return res.json({
            success: true,
            template: clientSpecificTemplate[0],
            type: "client-specific",
          });
        }

        // Fall back to user's default template (clientId is NULL)
        const defaultTemplate = await db
          .select()
          .from(customInvoiceTemplates)
          .where(
            and(
              eq(customInvoiceTemplates.userId, userId),
              eq(customInvoiceTemplates.clientId, "")
            )
          )
          .limit(1);

        if (defaultTemplate.length > 0) {
          return res.json({
            success: true,
            template: defaultTemplate[0],
            type: "default",
          });
        }

        // No custom template found
        return res.json({
          success: true,
          template: null,
          type: "none",
        });
      } catch (error) {
        console.error("[Templates] Error fetching client template:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch template",
        });
      }
    }
  );
}
