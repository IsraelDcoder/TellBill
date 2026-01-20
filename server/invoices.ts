import type { Express, Request, Response } from "express";
import {
  sendInvoiceEmail,
  sendInvoiceSMS,
  sendInvoiceWhatsApp,
} from "./emailService";

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
}

export function registerInvoiceRoutes(app: Express) {
  /**
   * POST /api/invoices/send
   * Send an invoice via email, SMS, or WhatsApp using real email service
   */
  app.post(
    "/api/invoices/send",
    async (req: Request, res: Response<SendInvoiceResponse>) => {
      try {
        console.log("[Invoice] POST /api/invoices/send received");
        const { invoiceId, method, contact, clientName, invoiceData } =
          req.body as SendInvoiceRequest;

        // Validate input
        if (!invoiceId || !method || !contact) {
          console.log("[Invoice] Validation failed - missing fields");
          return res.status(400).json({
            success: false,
            error: "Missing required fields: invoiceId, method, contact",
          });
        }

        // Validate method
        if (!["email", "sms", "whatsapp"].includes(method)) {
          console.log("[Invoice] Validation failed - invalid method:", method);
          return res.status(400).json({
            success: false,
            error: "Invalid method. Must be email, sms, or whatsapp",
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
  app.post("/api/invoices/send-email", async (req: Request, res: Response) => {
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
  app.post("/api/invoices/send-sms", async (req: Request, res: Response) => {
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
}