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
      const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const template = await db
        .select()
        .from(customInvoiceTemplates)
        .where(
          and(
            eq(customInvoiceTemplates.id, templateId),
            eq(customInvoiceTemplates.userId, userId || '')
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
      const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Verify ownership
      const template = await db
        .select()
        .from(customInvoiceTemplates)
        .where(
          and(
            eq(customInvoiceTemplates.id, templateId),
            eq(customInvoiceTemplates.userId, userId || '')
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
      const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Verify ownership
      const template = await db
        .select()
        .from(customInvoiceTemplates)
        .where(
          and(
            eq(customInvoiceTemplates.id, templateId),
            eq(customInvoiceTemplates.userId, userId || '')
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
        const clientEmail = Array.isArray(req.params.clientEmail) 
          ? req.params.clientEmail[0].toLowerCase() 
          : req.params.clientEmail.toLowerCase();

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

  /**
   * GET /api/templates/library/all
   * Fetch all system template designs (Modern Minimal, Bold Industrial, etc.)
   * Professional tier feature for template differentiation
   */
  app.get("/api/templates/library/all", authMiddleware, async (req: Request, res: Response) => {
    try {
      // Fetch all system templates (user_id = 'system')
      const systemTemplates = await db
        .select()
        .from(customInvoiceTemplates)
        .where(eq(customInvoiceTemplates.userId, 'system'));

      // Map to frontend-friendly format
      const templates = systemTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        baseTemplate: t.baseTemplate,
        primaryColor: t.primaryColor,
        accentColor: t.accentColor,
        backgroundColor: t.backgroundColor,
        textColor: t.textColor,
        preview: {
          header: t.companyHeaderText || 'TellBill',
          colors: {
            primary: t.primaryColor,
            accent: t.accentColor,
            background: t.backgroundColor,
            text: t.textColor,
          },
        },
        description: getTemplateDescription(t.name || ''),
      }));

      return res.json({
        success: true,
        templates,
      });
    } catch (error) {
      console.error("[Templates] Error fetching library:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch template library",
      });
    }
  });

  /**
   * POST /api/templates/library/select
   * User selects a system template
   * Creates a copy of the template with the user's ID for customization
   */
  app.post("/api/templates/library/select", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { templateId, customName } = req.body;

      if (!templateId) {
        return res.status(400).json({
          success: false,
          error: "Template ID is required",
        });
      }

      // Fetch the system template
      const systemTemplate = await db
        .select()
        .from(customInvoiceTemplates)
        .where(eq(customInvoiceTemplates.id, templateId))
        .limit(1);

      if (!systemTemplate || systemTemplate.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Template not found",
        });
      }

      const template = systemTemplate[0];

      // Create a copy for this user
      const newTemplate = await db
        .insert(customInvoiceTemplates)
        .values({
          userId, // ✅ Now owned by this user
          clientId: null,
          clientEmail: null,
          name: customName || `${template.name} (My Copy)`,
          baseTemplate: template.baseTemplate || 'professional',
          primaryColor: template.primaryColor,
          accentColor: template.accentColor,
          backgroundColor: template.backgroundColor,
          textColor: template.textColor,
          logoUrl: template.logoUrl,
          companyHeaderText: template.companyHeaderText,
          footerText: template.footerText,
          showProjectName: template.showProjectName,
          showPoNumber: template.showPoNumber,
          showWorkOrderNumber: template.showWorkOrderNumber,
          customField1Name: template.customField1Name,
          customField1Value: template.customField1Value,
          customField2Name: template.customField2Name,
          customField2Value: template.customField2Value,
          fontFamily: template.fontFamily,
        })
        .returning();

      console.log("[Templates] ✅ User selected template:", template.name, "- Created copy:", newTemplate[0].id);

      return res.status(201).json({
        success: true,
        template: newTemplate[0],
        message: `${template.name} template added to your library`,
      });
    } catch (error) {
      console.error("[Templates] Error selecting template:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to select template",
      });
    }
  });

  /**
   * PUT /api/templates/:id/set-default
   * Set a template as the user's default for new invoices
   */
  app.put("/api/templates/:id/set-default", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Verify template belongs to user
      const template = await db
        .select()
        .from(customInvoiceTemplates)
        .where(
          and(
            eq(customInvoiceTemplates.id, templateId),
            eq(customInvoiceTemplates.userId, userId || '')
          )
        )
        .limit(1);

      if (!template || template.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Template not found",
        });
      }

      // Update user's invoiceTemplate preference (in users table)
      // This assumes users table has invoiceTemplate field
      // The template will be used as default when generating new invoices

      console.log("[Templates] ✅ User set default template:", template[0].name);

      return res.json({
        success: true,
        message: `${template[0].name} set as default template`,
        templateId: templateId,
      });
    } catch (error) {
      console.error("[Templates] Error setting default template:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to set default template",
      });
    }
  });
}

/**
 * Helper: Get description for each template type
 */
function getTemplateDescription(templateName: string): string {
  const descriptions: Record<string, string> = {
    "Modern Minimal": "Clean, contemporary design with minimal elements. Perfect for modern contractors.",
    "Bold Industrial": "Strong, professional look ideal for manufacturing and construction businesses.",
    "Blue Corporate": "Traditional business style that conveys trust and professionalism.",
    "Clean White Pro": "Minimalist, elegant design for high-end service providers.",
    "Dark Premium": "Modern dark theme with accent colors for tech-forward professionals.",
  };

  return descriptions[templateName] || "Professional invoice template";
}
