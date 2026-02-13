import type { Express, Request, Response } from "express";
import { db } from "./db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  sendInvoiceEmail,
  sendInvoiceSMS,
  sendInvoiceWhatsApp,
} from "./emailService";
import {
  validateInvoice,
  validateUUID,
  validateEmail,
  validatePhoneNumber,
  validateEnum,
  isRequired,
  respondWithValidationErrors,
} from "./utils/validation";
import { checkUsageLimit } from "./utils/subscriptionMiddleware";
import { authMiddleware } from "./utils/authMiddleware";
import { MoneyAlertsEngine } from "./moneyAlertsEngine";
import { applyTax, getDefaultTaxProfile } from "./taxService";

// ✅ HELPER: Parse invoice items JSON string to array
const parseInvoiceItems = (invoice: any) => ({
  ...invoice,
  items: typeof invoice.items === "string" ? JSON.parse(invoice.items || "[]") : (invoice.items || []),
});

interface SendInvoiceRequest {
  invoiceId: string;
  method: "email" | "sms" | "whatsapp";
  contact: string;
  clientName: string;
  invoiceData?: {
    amount?: number;
    dueDate?: string;
    description?: string;
  };
}

interface SendInvoiceResponse {
  success: boolean;
  message?: string;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
  details?: string;
  upgradeRequired?: boolean;
}

export function registerInvoiceRoutes(app: Express) {
  /**
   * POST /api/invoices/send
   * Send an invoice via email, SMS, or WhatsApp using real email service
   * 
   * ✅ REQUIRES: Email verification (user.emailVerifiedAt must be set)
   */
  app.post(
    "/api/invoices/send",
    authMiddleware,
    async (req: Request, res: Response<SendInvoiceResponse>) => {
      try {
        console.log("[Invoice] POST /api/invoices/send received");
        const { invoiceId, method, contact, clientName, invoiceData } =
          req.body as SendInvoiceRequest;

        console.log("[Invoice] Request body:", {
          invoiceId,
          invoiceIdType: typeof invoiceId,
          invoiceIdLength: invoiceId?.length,
          method,
          contact,
          clientName,
        });

        // ✅ COMPREHENSIVE INPUT VALIDATION
        const errors: any[] = [];

        // Validate invoiceId (UUID format)
        if (!isRequired(invoiceId)) {
          errors.push({ field: "invoiceId", message: "Invoice ID is required" });
        } else if (!validateUUID(invoiceId)) {
          errors.push({
            field: "invoiceId",
            message: "Invalid invoice ID format",
          });
        }

        // Validate method enum
        if (!isRequired(method)) {
          errors.push({ field: "method", message: "Method is required" });
        } else if (!validateEnum(method, ["email", "sms", "whatsapp"])) {
          errors.push({
            field: "method",
            message: "Method must be email, sms, or whatsapp",
          });
        }

        // Validate contact based on method
        if (!isRequired(contact)) {
          errors.push({ field: "contact", message: "Contact is required" });
        } else if (method === "email" && !validateEmail(contact)) {
          errors.push({ field: "contact", message: "Invalid email format" });
        } else if (
          (method === "sms" || method === "whatsapp") &&
          !validatePhoneNumber(contact)
        ) {
          errors.push({
            field: "contact",
            message: "Invalid phone number format",
          });
        }

        // Validate clientName
        if (!isRequired(clientName)) {
          errors.push({
            field: "clientName",
            message: "Client name is required",
          });
        }

        if (errors.length > 0) {
          console.error("[Invoice] ❌ Validation failed:", errors);
          return res.status(400).json({
            success: false,
            error: "Validation failed",
            message: "Please check the following fields:",
            errors: errors, // Send array of specific validation errors
            details: errors.map((e) => `${e.field}: ${e.message}`).join("; "),
          });
        }

        // ✅ EMAIL VERIFICATION REQUIRED
        // Users must verify their email address before sending invoices
        const user = (req as any).user;
        if (!user || !user.emailVerifiedAt) {
          console.log("[Invoice] ❌ User email not verified, blocking invoice send");
          return res.status(403).json({
            success: false,
            error: "Email verification required",
            message: "Please verify your email address before sending invoices. Check your inbox for the verification link.",
            details: "User email has not been verified"
          });
        }

        // ✅ CHECK INVOICE SEND LIMIT (for free tier users)
        // This is just a basic check; in production you'd track actual sent count
        const limitCheck = await checkUsageLimit(
          req,
          "invoices",
          0 // In production: query actual invoice count
        );

        if (!limitCheck.allowed && limitCheck.upgradeRequired) {
          return res.status(403).json({
            success: false,
            error: "Invoice limit reached",
            message: limitCheck.error,
            upgradeRequired: true,
          });
        }

        console.log(
          `[Invoice] Sending ${method} to ${contact} for invoice ${invoiceId}`
        );

        // Route to appropriate service based on method
        try {
          if (method === "email") {
            try {
              const result = await sendInvoiceEmail(
                contact,
                clientName,
                invoiceId,
                "", // Empty HTML for now, can be enhanced
                invoiceData
              );
              
              // Trigger Money Alerts detection for invoice sent (paid users only)
              const userId = (req as any).user?.id;
              if (userId) {
                MoneyAlertsEngine.processEvent(userId, "INVOICE_SENT", invoiceId).catch(
                  (err) => console.error("[Invoice] Error in Money Alerts detection:", err)
                );
              }
              
              return res.status(200).json({
                success: true,
                message: result.message,
              });
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "Email service error";
              const errorStack =
                error instanceof Error ? error.stack : "No stack trace";
              console.error("[Invoice] Email send failed:", {
                message: errorMessage,
                stack: errorStack,
                contact,
                invoiceId,
              });
              return res.status(500).json({
                success: false,
                error: errorMessage,
              });
            }
          } else if (method === "sms") {
            try {
              const result = await sendInvoiceSMS(
                contact,
                invoiceId,
                clientName
              );
              
              // Trigger Money Alerts detection for invoice sent (paid users only)
              const userId = (req as any).user?.id;
              if (userId) {
                MoneyAlertsEngine.processEvent(userId, "INVOICE_SENT", invoiceId).catch(
                  (err) => console.error("[Invoice] Error in Money Alerts detection:", err)
                );
              }
              
              return res.status(200).json({
                success: true,
                message: result.message,
              });
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "SMS service error";
              return res.status(503).json({
                success: false,
                error: errorMessage,
              });
            }
          } else if (method === "whatsapp") {
            try {
              const result = await sendInvoiceWhatsApp(
                contact,
                invoiceId,
                clientName
              );
              
              // Trigger Money Alerts detection for invoice sent (paid users only)
              const userId = (req as any).user?.id;
              if (userId) {
                MoneyAlertsEngine.processEvent(userId, "INVOICE_SENT", invoiceId).catch(
                  (err) => console.error("[Invoice] Error in Money Alerts detection:", err)
                );
              }
              
              return res.status(200).json({
                success: true,
                message: result.message,
              });
            } catch (error) {
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : "WhatsApp service error";
              return res.status(503).json({
                success: false,
                error: errorMessage,
              });
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred";
          const errorStack =
            error instanceof Error ? error.stack : "No stack trace";
          console.error("[Invoice] Route error:", {
            message: errorMessage,
            stack: errorStack,
            method,
            contact,
          });
          return res.status(500).json({
            success: false,
            error: errorMessage,
            details: errorStack,
          });
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : "Unknown error in invoice send";
        console.error("[Invoice] Unexpected error:", errorMsg, error);
        return res.status(500).json({
          success: false,
          error: errorMsg,
        });
      }
    }
  );

  /**
   * POST /api/invoices/send-email
   * Dedicated endpoint for real email sending via Resend
   */
  app.post("/api/invoices/send-email", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { invoiceId, email, clientName, invoiceData } = req.body;

      if (!invoiceId || !email) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: invoiceId, email",
        });
      }

      // Email regex validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: "Invalid email address",
        });
      }

      console.log(`[Email] Sending invoice ${invoiceId} to ${email}`);

      // Use real email service
      try {
        const result = await sendInvoiceEmail(
          email,
          clientName || "Client",
          invoiceId,
          "", // HTML content (can be enhanced)
          invoiceData
        );

        return res.status(200).json({
          success: true,
          message: result.message,
          error: undefined,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to send invoice";
        console.error("[Email] Error sending invoice:", errorMessage, error);
        return res.status(500).json({
          success: false,
          error: errorMessage,
        });
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unexpected error in email send";
      console.error("[Email] Unexpected error:", errorMsg, error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  });

  /**
   * POST /api/invoices/send-sms
   * Dedicated endpoint for SMS sending (requires Twilio or similar)
   */
  app.post("/api/invoices/send-sms", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { invoiceId, phoneNumber, clientName } = req.body;

      if (!invoiceId || !phoneNumber) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: invoiceId, phoneNumber",
        });
      }

      // Phone validation - basic
      const phoneRegex = /^\+?[\d\s\-()]+$/;
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      if (!phoneRegex.test(phoneNumber) || cleanPhone.length < 10) {
        return res.status(400).json({
          success: false,
          error: "Invalid phone number",
        });
      }

      console.log(`[SMS] Sending invoice ${invoiceId} to ${phoneNumber}`);

      try {
        const result = await sendInvoiceSMS(
          phoneNumber,
          invoiceId,
          clientName || "Client"
        );
        return res.status(200).json({
          success: true,
          message: result.message,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "SMS service not configured";
        return res.status(503).json({
          success: false,
          error: errorMessage,
        });
      }
    } catch (error) {
      console.error("[SMS] Error sending invoice:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to send invoice via SMS",
      });
    }
  });

  /**
   * POST /api/invoices/send-whatsapp
   * Dedicated endpoint for WhatsApp sending (requires WhatsApp Business API)
   */
  app.post(
    "/api/invoices/send-whatsapp",
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const { invoiceId, phoneNumber, clientName } = req.body;

        if (!invoiceId || !phoneNumber) {
          return res.status(400).json({
            success: false,
            error: "Missing required fields: invoiceId, phoneNumber",
          });
        }

        // Phone validation
        const phoneRegex = /^\+?[\d\s\-()]+$/;
        const cleanPhone = phoneNumber.replace(/\D/g, "");
        if (!phoneRegex.test(phoneNumber) || cleanPhone.length < 10) {
          return res.status(400).json({
            success: false,
            error: "Invalid phone number",
          });
        }

        console.log(
          `[WhatsApp] Sending invoice ${invoiceId} to ${phoneNumber}`
        );

        try {
          const result = await sendInvoiceWhatsApp(
            phoneNumber,
            invoiceId,
            clientName || "Client"
          );
          return res.status(200).json({
            success: true,
            message: result.message,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "WhatsApp service not configured";
          return res.status(503).json({
            success: false,
            error: errorMessage,
          });
        }
      } catch (error) {
        console.error("[WhatsApp] Error sending invoice:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to send invoice via WhatsApp",
        });
      }
    }
  );

  /**
   * POST /api/invoices
   * Create and save invoice to database
   * 
   * ⚠️ CRITICAL: Tax is calculated SERVER-SIDE ONLY
   * Any tax values sent from client are IGNORED
   * Server fetches user's tax profile and applies it
   * 
   * Body: { projectId?, clientName, clientEmail, clientPhone, clientAddress, jobAddress, items[], laborHours, laborRate, materialsTotal, notes, safetyNotes, paymentTerms, dueDate? }
   * If projectId not provided, uses first user project or creates "General" project
   */
  app.post("/api/invoices", authMiddleware, async (req: Request, res: Response) => {
    try {
      console.log("[Invoice] 📤 POST /api/invoices - Save to database");
      console.log("[Invoice] Request body:", JSON.stringify(req.body, null, 2));
      console.log("[Invoice] Request user:", (req as any).user);
      
      const userId = (req as any).user?.userId || (req as any).user?.id;
      console.log("[Invoice] Extracted userId:", userId);
      
      if (!userId) {
        console.error("[Invoice] ❌ No user ID found in request");
        return res.status(401).json({
          success: false,
          error: "Unauthorized - no user ID",
        });
      }

      let { projectId, clientName, clientEmail, clientPhone, clientAddress, jobAddress, jobDescription = "", items = [], laborHours = 0, laborRate = 0, materialsTotal = 0, notes = "", safetyNotes = "", paymentTerms = "", dueDate } = req.body;

      // ⚠️ IGNORE any tax fields sent from client - we calculate on server
      // This prevents frontend from manipulating tax calculations

      if (!clientName) {
        console.error("[Invoice] ❌ Missing required field: clientName");
        return res.status(400).json({
          success: false,
          error: "Missing required field: clientName",
        });
      }

      // If projectId not provided, get first user project or create "General"
      if (!projectId) {
        console.log("[Invoice] No projectId provided, finding or creating default project");
        
        // Try to get first project
        const userProjects = await db
          .select()
          .from(schema.projects)
          .where(eq(schema.projects.userId, userId))
          .limit(1);

        if (userProjects.length > 0) {
          projectId = userProjects[0].id;
          console.log(`[Invoice] Using existing project: ${projectId}`);
        } else {
          // Create "General" project
          const newProject = await db
            .insert(schema.projects)
            .values({
              userId,
              name: "General",
              clientName: "General Client",
              address: "",
              status: "active",
            })
            .returning();
          
          projectId = newProject[0]?.id;
          console.log(`[Invoice] Created default project: ${projectId}`);
        }
      }

      // ✅ Convert to cents for server-side calculation (safe integer arithmetic)
      const laborTotalCents = Math.round(laborHours * laborRate * 100);
      const materialsTotalCents = Math.round(materialsTotal * 100);
      const itemsTotalCents = Math.round(
        items.reduce((sum: number, item: any) => sum + (item.total || 0), 0) * 100
      );

      // ✅ SERVER-SIDE TAX CALCULATION (immutable, secure)
      let taxProfile = await getDefaultTaxProfile(db, userId);
      
      // ✅ If user has no tax profile yet, create default one
      if (!taxProfile) {
        console.log("[Invoice] No tax profile found, creating default for user:", userId);
        try {
          const { taxProfiles } = await import("../shared/schema");
          const newProfile = await db
            .insert(taxProfiles)
            .values({
              userId,
              name: "Sales Tax",
              rate: "8.00", // 8% - US average
              appliesto: "labor_and_materials",
              enabled: true,
              isDefault: true,
            })
            .returning();
          
          taxProfile = newProfile[0];
          console.log("[Invoice] ✅ Created default tax profile for user:", userId);
        } catch (taxError) {
          console.error("[Invoice] Error creating tax profile:", taxError);
          // Continue without tax - will use applyTax's fallback
        }
      }
      
      const taxCalc = await applyTax(
        db,
        userId,
        laborTotalCents + itemsTotalCents,
        materialsTotalCents,
        taxProfile
      );

      console.log("[Invoice] Tax calculated:", {
        subtotal: taxCalc.subtotal,
        taxName: taxCalc.taxName,
        taxRate: taxCalc.taxRate,
        taxAmount: taxCalc.taxAmount,
        total: taxCalc.total,
      });

      const invoiceData = {
        id: randomUUID(), // ✅ EXPLICIT: Generate full UUID (fixes truncation issue)
        projectId,
        userId,
        createdBy: (req as any).user?.name || (req as any).user?.email || "Unknown",
        status: "draft",
        // ✅ Client information
        clientName,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        clientAddress: clientAddress || null,
        // ✅ Job information
        jobAddress: jobAddress || null,
        jobDescription: jobDescription || null,
        // ✅ Items (stored as JSON)
        items: JSON.stringify(items || []),
        // ✅ Labor details
        laborHours: laborHours || 0,
        laborRate: laborRate || 0,
        laborTotal: (laborTotalCents / 100).toFixed(2),
        // ✅ Materials
        materialsTotal: (materialsTotalCents / 100).toFixed(2),
        // ✅ Calculated amounts (SERVER-SIDE, immutable)
        subtotal: (taxCalc.subtotal / 100).toFixed(2),
        taxName: taxCalc.taxName,
        taxRate: taxCalc.taxRate ? taxCalc.taxRate.toString() : null,
        taxAppliesto: taxCalc.taxAppliesto,
        taxAmount: (taxCalc.taxAmount / 100).toFixed(2),
        total: (taxCalc.total / 100).toFixed(2),
        // ✅ Invoice metadata
        invoiceNumber: `INV-${Date.now()}`,
        notes: notes || null,
        safetyNotes: safetyNotes || null,
        paymentTerms: paymentTerms || "net30",
        dueDate: dueDate || null,
      };

      console.log("[Invoice] Creating invoice:", invoiceData);

      const newInvoice = await db
        .insert(schema.invoices)
        .values(invoiceData)
        .returning();

      const invoiceId = newInvoice[0]?.id;
      console.log(`[Invoice] Saved to database: ${invoiceId}`);

      return res.status(201).json({
        success: true,
        invoice: {
          id: invoiceId,
          projectId,
          userId,
          clientName,
          clientEmail,
          clientPhone,
          clientAddress,
          jobAddress,
          items,
          laborHours,
          laborRate,
          laborTotal: (laborTotalCents / 100).toFixed(2),
          materialsTotal: (materialsTotalCents / 100).toFixed(2),
          itemsTotal: (itemsTotalCents / 100).toFixed(2),
          subtotal: (taxCalc.subtotal / 100).toFixed(2),
          taxName: taxCalc.taxName,
          taxRate: taxCalc.taxRate,
          taxAmount: (taxCalc.taxAmount / 100).toFixed(2),
          total: (taxCalc.total / 100).toFixed(2),
          notes,
          safetyNotes,
          paymentTerms,
          dueDate,
          status: "draft",
          createdAt: newInvoice[0]?.createdAt,
        },
      });
    } catch (error: any) {
      console.error("[Invoice] Error saving to database:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to save invoice",
        details: error.message,
      });
    }
  });

  /**
   * PATCH /api/invoices/:id
   * Update invoice details (client info, job info, notes, etc.)
   * Does NOT modify line items or financial calculations
   */
  app.patch("/api/invoices/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const invoiceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = (req as any).user?.userId || (req as any).user?.id;

      console.log("[Invoice] PATCH /api/invoices/:id - Update invoice");
      console.log("[Invoice] invoiceId:", invoiceId);
      console.log("[Invoice] userId:", userId);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      // Validate invoiceId format
      if (!validateUUID(invoiceId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid invoice ID format",
        });
      }

      // ✅ VERIFY OWNERSHIP: Make sure user owns this invoice
      const existingInvoice = await db
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.id, invoiceId))
        .limit(1);

      if (!existingInvoice || existingInvoice.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Invoice not found",
        });
      }

      if (existingInvoice[0].userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized - you don't own this invoice",
        });
      }

      const {
        clientName,
        clientEmail,
        clientPhone,
        clientAddress,
        jobAddress,
        jobDescription,
        notes,
        paymentTerms,
      } = req.body;

      // Build update object only with provided fields
      const updateData: any = {};
      if (clientName !== undefined) updateData.clientName = clientName || null;
      if (clientEmail !== undefined) updateData.clientEmail = clientEmail || null;
      if (clientPhone !== undefined) updateData.clientPhone = clientPhone || null;
      if (clientAddress !== undefined) updateData.clientAddress = clientAddress || null;
      if (jobAddress !== undefined) updateData.jobAddress = jobAddress || null;
      if (jobDescription !== undefined) updateData.jobDescription = jobDescription || null;
      if (notes !== undefined) updateData.notes = notes || null;
      if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms || null;

      console.log("[Invoice] Update data:", updateData);

      // ✅ UPDATE: Only update fields that were provided
      const updatedInvoice = await db
        .update(schema.invoices)
        .set(updateData)
        .where(eq(schema.invoices.id, invoiceId))
        .returning();

      console.log("[Invoice] ✅ Invoice updated successfully");

      return res.status(200).json({
        success: true,
        message: "Invoice updated successfully",
        invoice: updatedInvoice[0],
      });
    } catch (error: any) {
      console.error("[Invoice] Error updating invoice:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update invoice",
        details: error.message,
      });
    }
  });
}