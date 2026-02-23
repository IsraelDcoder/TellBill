import type { Express, Request, Response } from "express";
import { db } from "./db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

import { resolvePaymentInfo } from "./lib/paymentResolver";
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

/**
 * ✅ CRITICAL: Convert numeric fields from dollars (decimal) to cents (integer)
 * Database stores financial values as numeric with scale 2 (e.g., 50.00 = fifty dollars)
 * Frontend expects these as integers in cents (e.g., 5000 = fifty dollars)
 */
const convertCentsToDollars = (value: any): number => {
  if (!value && value !== 0) return 0;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return 0;
  return Math.round(num * 100); // Convert dollars to cents
};

// ✅ HELPER: Parse invoice items JSON string to array AND convert numeric values
const parseInvoiceItems = (invoice: any) => ({
  ...invoice,
  items: typeof invoice.items === "string" ? JSON.parse(invoice.items || "[]") : (invoice.items || []),
  // ✅ CRITICAL: Convert all numeric fields from database format (dollars) to app format (cents)
  total: convertCentsToDollars(invoice.total),
  subtotal: convertCentsToDollars(invoice.subtotal),
  taxAmount: convertCentsToDollars(invoice.taxAmount),
  laborTotal: convertCentsToDollars(invoice.laborTotal),
  materialsTotal: convertCentsToDollars(invoice.materialsTotal),
  itemsTotal: convertCentsToDollars(invoice.itemsTotal),
  laborRate: convertCentsToDollars(invoice.laborRate),
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
        if (!user) {
          console.log("[Invoice] ❌ User not authenticated");
          return res.status(403).json({
            success: false,
            error: "Authentication required"
          });
        }

        // ✅ CHECK EMAIL VERIFICATION - query database for latest status (not from cached JWT)
        const latestUserResult = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, user.userId))
          .limit(1);

        const latestUser = latestUserResult[0];
        
        if (!latestUser) {
          console.log(`[Invoice] ❌ User ${user.userId} not found in database`);
          return res.status(403).json({
            success: false,
            error: "User not found"
          });
        }

        console.log(`[Invoice] Email verification status for ${latestUser.email}: ${latestUser.emailVerifiedAt ? "✅ VERIFIED" : "❌ NOT VERIFIED"}`);

        if (!latestUser.emailVerifiedAt) {
          console.log(`[Invoice] ❌ Blocking invoice send - email not verified`);
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

        // ✅ FETCH INVOICE FROM DATABASE to get complete invoice data including items
        const invoiceResult = await db
          .select()
          .from(schema.invoices)
          .where(eq(schema.invoices.id, Array.isArray(invoiceId) ? invoiceId[0] : invoiceId))
          .limit(1);

        if (!invoiceResult || invoiceResult.length === 0) {
          console.error(`[Invoice] ❌ Invoice ${invoiceId} not found in database`);
          return res.status(404).json({
            success: false,
            error: "Invoice not found",
            message: `Invoice ${invoiceId} not found in database`,
            details: "The invoice you're trying to send doesn't exist or has been deleted"
          });
        }

        const dbInvoice = invoiceResult[0];
        
        // ✅ FETCH USER FOR PAYMENT INFO RESOLUTION
        const invoiceUserResult = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, dbInvoice.userId || ''))
          .limit(1);

        if (!invoiceUserResult || invoiceUserResult.length === 0) {
          return res.status(404).json({
            success: false,
            error: "User not found",
          });
        }

        const invoiceUser = invoiceUserResult[0];
        const paymentInfo = resolvePaymentInfo(dbInvoice, invoiceUser);
        
        // ✅ Parse items JSON and build complete invoiceData object
        let items: any[] = [];
        if (dbInvoice.items) {
          try {
            const parsedItems = typeof dbInvoice.items === 'string' 
              ? JSON.parse(dbInvoice.items) 
              : dbInvoice.items;
            items = Array.isArray(parsedItems) ? parsedItems : [];
          } catch (parseError) {
            console.warn(`[Invoice] Warning: Failed to parse items JSON for invoice ${invoiceId}:`, parseError);
            items = [];
          }
        }

        // ✅ Build complete invoiceData object with all fields from database
        const completeInvoiceData = {
          clientName: dbInvoice.clientName || clientName,
          clientEmail: dbInvoice.clientEmail || undefined,
          clientPhone: dbInvoice.clientPhone || undefined,
          total: typeof dbInvoice.total === 'string' ? parseFloat(dbInvoice.total) : dbInvoice.total || 0,
          taxAmount: typeof dbInvoice.taxAmount === 'string' ? parseFloat(dbInvoice.taxAmount) : dbInvoice.taxAmount || 0,
          subtotal: typeof dbInvoice.subtotal === 'string' ? parseFloat(dbInvoice.subtotal) : dbInvoice.subtotal || 0,
          items: items,
          laborHours: dbInvoice.laborHours || 0,
          laborRate: typeof dbInvoice.laborRate === 'string' ? parseFloat(dbInvoice.laborRate) : dbInvoice.laborRate || 0,
          laborTotal: typeof dbInvoice.laborTotal === 'string' ? parseFloat(dbInvoice.laborTotal) : dbInvoice.laborTotal || 0,
          materialsTotal: typeof dbInvoice.materialsTotal === 'string' ? parseFloat(dbInvoice.materialsTotal) : dbInvoice.materialsTotal || 0,
          notes: dbInvoice.notes || undefined,
          dueDate: dbInvoice.dueDate ? new Date(dbInvoice.dueDate).toISOString().split('T')[0] : undefined,
          paymentTerms: dbInvoice.paymentTerms || undefined,
        };

        console.log(`[Invoice] ✅ Fetched invoice from DB with ${items.length} items:`, {
          invoiceId,
          itemCount: items.length,
          total: completeInvoiceData.total,
        });

        // ✅ PAYMENT: Using Google IAP (RevenueCat) via mobile app only
        // Web/email invoices don't include payment links - subscriptions managed via app
        const paymentLinkUrl: string | null = null;

        // Route to appropriate service based on method
        try {
          if (method === "email") {
            try {
              const result = await sendInvoiceEmail(
                contact,
                clientName,
                invoiceId,
                "", // Empty HTML for now, can be enhanced
                completeInvoiceData,
                paymentLinkUrl ?? undefined, // ✅ Pass payment link to email (convert null to undefined)
                paymentInfo // ✅ Pass resolved payment info
              );
              
              // ✅ UPDATE INVOICE STATUS TO "SENT" in database
              await db
                .update(schema.invoices)
                .set({ status: "sent" })
                .where(eq(schema.invoices.id, invoiceId));
              
              console.log(`[Invoice] ✅ Updated invoice ${invoiceId} status to "sent"`);
              
              // Trigger Money Alerts detection for invoice sent (paid users only)
              const userId = (req as any).user?.userId;
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
                clientName,
                dbInvoice.total ? Math.round(Number(dbInvoice.total) * 100) : 0,
                paymentInfo // ✅ Pass resolved payment info
              );
              
              // ✅ UPDATE INVOICE STATUS TO "SENT" in database
              await db
                .update(schema.invoices)
                .set({ status: "sent" })
                .where(eq(schema.invoices.id, invoiceId));
              
              console.log(`[Invoice] ✅ Updated invoice ${invoiceId} status to "sent"`);
              
              // Trigger Money Alerts detection for invoice sent (paid users only)
              const userId = (req as any).user?.userId;
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
              // ✅ Use already-fetched paymentInfo (resolved earlier)
              const result = await sendInvoiceWhatsApp(
                contact,
                dbInvoice.invoiceNumber || invoiceId,
                clientName,
                dbInvoice.total ? Math.round(Number(dbInvoice.total) * 100) : 0,
                paymentInfo
              );
              
              // ✅ UPDATE INVOICE STATUS TO "SENT" in database
              await db
                .update(schema.invoices)
                .set({ status: "sent" })
                .where(eq(schema.invoices.id, invoiceId));
              
              console.log(`[Invoice] ✅ Updated invoice ${invoiceId} status to "sent"`);
              
              // Trigger Money Alerts detection for invoice sent (paid users only)
              const userId = (req as any).user?.userId;
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

      // ✅ FIXED: Client already sends amounts in cents, do NOT multiply by 100 again!
      // laborRate is in cents (e.g., 3600 for $36/hr)
      // materialsTotal is in cents (already converted by client)
      // item.total is in cents (already converted by client)
      const laborTotalCents = Math.round(laborHours * laborRate);
      const materialsTotalCents = Math.round(materialsTotal);
      const itemsTotalCents = Math.round(
        items.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
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
        // ✅ Labor details (STORED IN CENTS, converted to string)
        laborHours: laborHours || 0,
        laborRate: laborRate || 0,
        laborTotal: laborTotalCents.toString(),
        // ✅ Materials (STORED IN CENTS, converted to string)
        materialsTotal: materialsTotalCents.toString(),
        // ✅ Calculated amounts - ALL IN CENTS (SERVER-SIDE, immutable, converted to string)
        subtotal: taxCalc.subtotal.toString(),
        taxName: taxCalc.taxName,
        taxRate: taxCalc.taxRate ? taxCalc.taxRate.toString() : null,
        taxAppliesto: taxCalc.taxAppliesto,
        taxAmount: taxCalc.taxAmount.toString(),
        total: taxCalc.total.toString(),
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
          laborTotal: laborTotalCents,
          materialsTotal: materialsTotalCents,
          itemsTotal: itemsTotalCents,
          subtotal: taxCalc.subtotal,
          taxName: taxCalc.taxName,
          taxRate: taxCalc.taxRate,
          taxAmount: taxCalc.taxAmount,
          total: taxCalc.total,
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
      const normalizedId = Array.isArray(invoiceId) ? invoiceId[0] : invoiceId;
      const existingInvoice = await db
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.id, normalizedId))
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
        status,
        paidAt,
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
      
      // ✅ CRITICAL: Allow status updates (e.g., sent → paid)
      if (status !== undefined) {
        updateData.status = status;
        console.log(`[Invoice] 💾 Updating status to: ${status}`);
      }
      
      // ✅ CRITICAL: Persist paid timestamp when marking as paid
      if (paidAt !== undefined) {
        updateData.paidAt = paidAt ? new Date(paidAt) : null;
        console.log(`[Invoice] 💾 Updating paidAt to: ${paidAt}`);
      }

      console.log("[Invoice] Update data:", updateData);

      // ✅ UPDATE: Only update fields that were provided
      const normalizedUpdateId = Array.isArray(invoiceId) ? invoiceId[0] : invoiceId;
      const updatedInvoice = await db
        .update(schema.invoices)
        .set(updateData)
        .where(eq(schema.invoices.id, normalizedUpdateId))
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

  /**
   * DELETE /api/invoices/:id
   * Delete an invoice permanently from database
   * ✅ CRITICAL: Verify user ownership (userId + invoiceId)
   */
  app.delete("/api/invoices/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const invoiceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = (req as any).user?.userId || (req as any).user?.id;

      console.log("[Invoice] DELETE /api/invoices/:id");
      console.log("[Invoice] invoiceId:", invoiceId);
      console.log("[Invoice] userId:", userId);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      // Validate invoiceId format
      const normalizedDeleteId = Array.isArray(invoiceId) ? invoiceId[0] : invoiceId;
      if (!validateUUID(normalizedDeleteId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid invoice ID format",
        });
      }

      // ✅ CRITICAL: Verify ownership BEFORE deleting
      // Make sure user owns this invoice
      const existingInvoice = await db
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.id, normalizedDeleteId))
        .limit(1);

      if (!existingInvoice || existingInvoice.length === 0) {
        console.log(`[Invoice] ❌ Invoice ${invoiceId} not found`);
        return res.status(404).json({
          success: false,
          error: "Invoice not found",
        });
      }

      if (existingInvoice[0].userId !== userId) {
        console.log(`[Invoice] ❌ User ${userId} does not own invoice ${invoiceId}`);
        return res.status(403).json({
          success: false,
          error: "Unauthorized - you don't own this invoice",
        });
      }

      // ✅ DELETE: Remove invoice from database
      const invoiceNumber = existingInvoice[0].invoiceNumber;
      await db
        .delete(schema.invoices)
        .where(eq(schema.invoices.id, normalizedDeleteId));

      console.log(`[Invoice] ✅ Invoice ${invoiceNumber} (${invoiceId}) deleted permanently`);

      return res.status(200).json({
        success: true,
        message: "Invoice deleted successfully",
        invoiceId,
        invoiceNumber,
      });
    } catch (error: any) {
      console.error("[Invoice] Error deleting invoice:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to delete invoice",
        details: error.message,
      });
    }
  });

  /**
   * POST /api/invoices/:id/payment-link
   * Generate a Stripe checkout link for an invoice
   * Client can pay directly from this link
   */
  app.post("/api/invoices/:id/payment-link", authMiddleware, async (req: Request, res: Response) => {
    try {
      const invoiceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = (req as any).user?.userId || (req as any).user?.id;

      console.log("[Invoice] POST /api/invoices/:id/payment-link");
      console.log("[Invoice] invoiceId:", invoiceId);

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

      // ✅ FETCH INVOICE
      const normalizedPaymentId = Array.isArray(invoiceId) ? invoiceId[0] : invoiceId;
      const invoiceResult = await db
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.id, normalizedPaymentId))
        .limit(1);

      if (!invoiceResult || invoiceResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Invoice not found",
        });
      }

      const invoice = invoiceResult[0];

      // ✅ VERIFY OWNERSHIP
      if (invoice.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized - you don't own this invoice",
        });
      }

      // ✅ CHECK IF PAYMENT LINK ALREADY EXISTS
      if (invoice.paymentLinkUrl && invoice.stripeCheckoutSessionId) {
        console.log("[Invoice] ✅ Payment link already exists for invoice", invoiceId);
        return res.status(200).json({
          success: true,
          message: "Payment link already generated",
          paymentLinkUrl: invoice.paymentLinkUrl,
        });
      }

      // ✅ PAYMENT: Using Google IAP only
      // Contractors manage subscriptions via mobile app (iOS / Android)
      // Not using payment links for web invoices
      const paymentLinkUrl = null;
      const stripeCheckoutSessionId = null;

      console.log(`[Invoice] ✅ Generated payment link for invoice ${invoiceId}`);
      console.log(`[Invoice] Payment URL: ${paymentLinkUrl}`);

      return res.status(200).json({
        success: true,
        message: "Payment link generated successfully",
        paymentLinkUrl,
        invoiceId,
      });
    } catch (error: any) {
      console.error("[Invoice] Error generating payment link:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to generate payment link",
        details: error.message,
      });
    }
  });

  /**
   * GET /api/invoices/:id
   * Fetch invoice with resolved payment info
   * Returns: invoice with paymentInfo object (override > default)
   */
  app.get("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      const invoiceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const invoice = await db
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.id, invoiceId))
        .limit(1);

      if (!invoice || invoice.length === 0) {
        return res.status(404).json({ success: false, error: "Invoice not found" });
      }

      // ✅ Fetch user for payment info
      const userId = invoice[0].userId || "";
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (!user || user.length === 0) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // ✅ Resolve payment info (override > company default)
      const paymentInfo = resolvePaymentInfo(invoice[0], user[0]);

      return res.json({
        success: true,
        invoice: {
          ...invoice[0],
          paymentInfo,
        },
      });
    } catch (error) {
      console.error("[Invoices] Error fetching invoice:", error);
      return res.status(500).json({ success: false, error: "Failed to fetch invoice" });
    }
  });

  /**
   * PATCH /api/invoices/:id
   * Update invoice with payment info overrides
   * Allows per-invoice override of company payment info
   */
  app.patch("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      const invoiceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const {
        paymentMethodTypeOverride,
        paymentAccountNumberOverride,
        paymentBankNameOverride,
        paymentAccountNameOverride,
        paymentLinkOverride,
        paymentInstructionsOverride,
      } = req.body;

      const invoice = await db
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.id, invoiceId))
        .limit(1);

      if (!invoice || invoice.length === 0) {
        return res.status(404).json({ success: false, error: "Invoice not found" });
      }

      // ✅ Update with payment overrides
      const updated = await db
        .update(schema.invoices)
        .set({
          paymentMethodTypeOverride,
          paymentAccountNumberOverride,
          paymentBankNameOverride,
          paymentAccountNameOverride,
          paymentLinkOverride,
          paymentInstructionsOverride,
        })
        .where(eq(schema.invoices.id, invoiceId))
        .returning();

      // Fetch user for payment resolution
      const paymentUserId = updated[0].userId || "";
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, paymentUserId))
        .limit(1);

      if (!user || user.length === 0) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // ✅ Resolve payment info
      const paymentInfo = resolvePaymentInfo(updated[0], user[0]);

      return res.json({
        success: true,
        invoice: {
          ...updated[0],
          paymentInfo,
        },
      });
    } catch (error) {
      console.error("[Invoices] Error updating invoice:", error);
      return res.status(500).json({ success: false, error: "Failed to update invoice" });
    }
  });
}