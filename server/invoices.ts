import type { Express, Request, Response } from "express";
import { db } from "./db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";
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
import { applyTax } from "./taxService";

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
          return respondWithValidationErrors(res, errors);
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

      let { projectId, clientName, clientEmail, clientPhone, clientAddress, jobAddress, items = [], laborHours = 0, laborRate = 0, materialsTotal = 0, notes = "", safetyNotes = "", paymentTerms = "", dueDate } = req.body;

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
      const taxCalc = await applyTax(
        db,
        userId,
        laborTotalCents + itemsTotalCents,
        materialsTotalCents
      );

      console.log("[Invoice] Tax calculated:", {
        subtotal: taxCalc.subtotal,
        taxName: taxCalc.taxName,
        taxRate: taxCalc.taxRate,
        taxAmount: taxCalc.taxAmount,
        total: taxCalc.total,
      });

      const invoiceData = {
        projectId,
        userId,
        createdBy: (req as any).user?.name || (req as any).user?.email || "Unknown",
        status: "draft",
        // ✅ Store tax snapshot (immutable)
        subtotal: (taxCalc.subtotal / 100).toFixed(2),
        taxName: taxCalc.taxName,
        taxRate: taxCalc.taxRate ? taxCalc.taxRate.toString() : null,
        taxAppliesto: taxCalc.taxAppliesto,
        taxAmount: (taxCalc.taxAmount / 100).toFixed(2),
        total: (taxCalc.total / 100).toFixed(2),
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
}