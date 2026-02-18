import type { Express, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { receipts, materialCostEvents, invoices, users } from "@shared/schema";
import { db } from "./db";
import { authMiddleware } from "./utils/authMiddleware";
import { MoneyAlertsEngine } from "./moneyAlertsEngine";
import { v4 as uuidv4 } from "uuid";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Rate limit tracking (in-memory, replace with Redis for production)
const scanLimits = new Map<string, { count: number; resetTime: number }>();
const SCANS_PER_DAY = 20;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if user is on paid plan
 * Returns 403 if user is free tier
 */
function isPaidPlan(plan: string | null): boolean {
  return !!plan && ["solo", "professional"].includes(plan);
}

/**
 * Rate limit check for scan operations
 */
function checkScanRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = scanLimits.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset limit window
    scanLimits.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= SCANS_PER_DAY) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Extract receipt data using Vision LLM via OpenRouter
 * Returns JSON with vendor, date, total, items
 */
async function extractReceiptData(
  imageBase64: string
): Promise<{
  vendor: string;
  date: string;
  total: string;
  items: Array<{ name: string; quantity: number; unitPrice: string; total: string }>;
}> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const prompt = `You are a receipt analysis expert. Analyze this receipt image and extract the following information in JSON format:

{
  "vendor": "store/company name",
  "date": "YYYY-MM-DD format",
  "total": "total amount as string (e.g., '125.50')",
  "items": [
    {
      "name": "item description",
      "quantity": 1,
      "unitPrice": "price per unit as string",
      "total": "line total as string"
    }
  ]
}

If any field is unclear or not visible, use null for that field.
Return ONLY valid JSON, no markdown or explanation.`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4-vision",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Material Costs] OpenRouter error:", error);
      throw new Error(`Vision API failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in Vision API response");
    }

    // Parse JSON response
    const extracted = JSON.parse(content);

    // Validate required fields
    if (!extracted.vendor || !extracted.total) {
      throw new Error("Missing required fields in extraction");
    }

    return {
      vendor: String(extracted.vendor),
      date: extracted.date || new Date().toISOString().split("T")[0],
      total: String(extracted.total),
      items: Array.isArray(extracted.items)
        ? extracted.items.map((item: any) => ({
            name: String(item.name || "Unknown Item"),
            quantity: Number(item.quantity || 1),
            unitPrice: String(item.unitPrice || "0"),
            total: String(item.total || "0"),
          }))
        : [],
    };
  } catch (error) {
    console.error("[Material Costs] Extract error:", error);
    throw error;
  }
}

/**
 * Store image to cloud storage (placeholder - replace with actual storage)
 * For now, we'll return a data URI
 */
async function storeReceiptImage(imageBase64: string): Promise<string> {
  // In production, upload to S3, GCS, or Cloudinary
  // For now, return base64 data URI
  return `data:image/jpeg;base64,${imageBase64}`;
}

/**
 * Create Money Alert for unbilled receipt
 * Integrates with Money Alerts system
 */
async function createMoneyAlertForUnbilledReceipt(
  receipt: typeof receipts.$inferSelect
): Promise<void> {
  // This will trigger the Money Alert system
  // Frontend will fetch from /api/alerts/money endpoint
  // Money Alerts are generated on-demand, not stored
  console.log(
    `[Material Costs] Money Alert trigger for receipt ${receipt.id}: $${receipt.totalAmount} from ${receipt.vendor}`
  );
}

/**
 * Register Material Cost Capture routes
 */
export function registerMaterialCostRoutes(app: Express) {
  /**
   * POST /api/material-costs/scan
   * Upload receipt image and extract data via Vision LLM
   *
   * Body: { imageBase64: string }
   * Returns: { vendor, date, total, items, receiptId }
   */
  app.post(
    "/api/material-costs/scan",
    authMiddleware,
    async (req: any, res: Response) => {
      try {
        const userId = req.userId;
        const { imageBase64 } = req.body;

        // Validate input
        if (!imageBase64 || typeof imageBase64 !== "string") {
          return res.status(400).json({
            success: false,
            error: "imageBase64 is required and must be a string",
          });
        }

        // Check plan
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (user.length === 0) {
          return res.status(404).json({
            success: false,
            error: "User not found",
          });
        }

        const userPlan = user[0].currentPlan || user[0].subscriptionTier;
        if (!isPaidPlan(userPlan)) {
          return res.status(403).json({
            success: false,
            error: "Material Cost Capture requires a paid plan",
            upgradeRequired: true,
          });
        }

        // Check rate limit
        if (!checkScanRateLimit(userId)) {
          return res.status(429).json({
            success: false,
            error: "Daily scan limit exceeded (20 per day)",
          });
        }

        // Extract data from receipt
        const extractedData = await extractReceiptData(imageBase64);

        // Store image
        const imageUrl = await storeReceiptImage(imageBase64);

        // Create receipt record
        const receipt = await db
          .insert(receipts)
          .values({
            userId,
            vendor: extractedData.vendor,
            totalAmount: extractedData.total,
            currency: "USD",
            purchaseDate: new Date(extractedData.date),
            imageUrl,
            billable: false, // Default to false until user makes decision
            items: JSON.stringify(extractedData.items),
          })
          .returning();

        if (!receipt || receipt.length === 0) {
          throw new Error("Failed to create receipt record");
        }

        const createdReceipt = receipt[0];

        // Log event
        await db.insert(materialCostEvents).values({
          receiptId: createdReceipt.id,
          userId,
          action: "CREATED",
          metadata: JSON.stringify({
            vendor: extractedData.vendor,
            amount: extractedData.total,
          }),
        });

        // Trigger Money Alerts detection for unbilled receipts (paid users only)
        MoneyAlertsEngine.processEvent(userId, "RECEIPT_CREATED", createdReceipt.id).catch(
          (err) => console.error("[MaterialCosts] Error in Money Alerts detection:", err)
        );

        return res.status(200).json({
          success: true,
          data: {
            receiptId: createdReceipt.id,
            vendor: extractedData.vendor,
            date: extractedData.date,
            total: extractedData.total,
            items: extractedData.items,
            imageUrl: createdReceipt.imageUrl,
          },
        });
      } catch (error) {
        console.error("[Material Costs] Scan error:", error);
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to scan receipt",
        });
      }
    }
  );

  /**
   * POST /api/material-costs/:id/mark-billable
   * Mark receipt as billable and attach to client
   *
   * Body: { clientName?: string, clientEmail?: string, existingClientId?: string }
   */
  app.post(
    "/api/material-costs/:id/mark-billable",
    authMiddleware,
    async (req: any, res: Response) => {
      try {
        const userId = req.userId;
        const receiptId = req.params.id;
        const { clientName, clientEmail } = req.body;

        // Verify receipt ownership
        const receipt = await db
          .select()
          .from(receipts)
          .where(and(eq(receipts.id, receiptId), eq(receipts.userId, userId)))
          .limit(1);

        if (receipt.length === 0) {
          return res.status(404).json({
            success: false,
            error: "Receipt not found",
          });
        }

        // Validate client info
        if (!clientName && !clientEmail) {
          return res.status(400).json({
            success: false,
            error: "clientName or clientEmail is required",
          });
        }

        // Update receipt
        await db
          .update(receipts)
          .set({
            billable: true,
            clientName: clientName || null,
            clientEmail: clientEmail || null,
            updatedAt: new Date(),
          })
          .where(eq(receipts.id, receiptId));

        // Log event
        await db.insert(materialCostEvents).values({
          receiptId,
          userId,
          action: "MARKED_BILLABLE",
          metadata: JSON.stringify({
            clientName,
            clientEmail,
          }),
        });

        // Create money alert for unbilled material
        const updatedReceipt = receipt[0];
        await createMoneyAlertForUnbilledReceipt(updatedReceipt);

        return res.status(200).json({
          success: true,
          message: "Receipt marked as billable. TellBill will alert you if it's not billed.",
        });
      } catch (error) {
        console.error("[Material Costs] Mark billable error:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to mark receipt as billable",
        });
      }
    }
  );

  /**
   * POST /api/material-costs/:id/mark-non-billable
   * Mark receipt as non-billable with reason
   *
   * Body: { reason: 'personal' | 'overhead' | 'warranty' | 'other', details?: string }
   */
  app.post(
    "/api/material-costs/:id/mark-non-billable",
    authMiddleware,
    async (req: any, res: Response) => {
      try {
        const userId = req.userId;
        const receiptId = req.params.id;
        const { reason } = req.body;

        // Validate reason
        const validReasons = ["personal", "overhead", "warranty", "other"];
        if (!reason || !validReasons.includes(reason)) {
          return res.status(400).json({
            success: false,
            error: "Valid reason required: personal, overhead, warranty, or other",
          });
        }

        // Verify receipt ownership
        const receipt = await db
          .select()
          .from(receipts)
          .where(and(eq(receipts.id, receiptId), eq(receipts.userId, userId)))
          .limit(1);

        if (receipt.length === 0) {
          return res.status(404).json({
            success: false,
            error: "Receipt not found",
          });
        }

        // Update receipt
        await db
          .update(receipts)
          .set({
            billable: false,
            notBillableReason: reason,
            updatedAt: new Date(),
          })
          .where(eq(receipts.id, receiptId));

        // Log event
        await db.insert(materialCostEvents).values({
          receiptId,
          userId,
          action: "MARKED_NON_BILLABLE",
          metadata: JSON.stringify({ reason }),
        });

        return res.status(200).json({
          success: true,
          message: "Receipt marked as non-billable.",
        });
      } catch (error) {
        console.error("[Material Costs] Mark non-billable error:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to mark receipt as non-billable",
        });
      }
    }
  );

  /**
   * POST /api/material-costs/:id/attach-to-invoice
   * Attach material cost receipt to an invoice
   *
   * Body: { invoiceId: string }
   */
  app.post(
    "/api/material-costs/:id/attach-to-invoice",
    authMiddleware,
    async (req: any, res: Response) => {
      try {
        const userId = req.userId;
        const receiptId = req.params.id;
        const { invoiceId } = req.body;

        if (!invoiceId) {
          return res.status(400).json({
            success: false,
            error: "invoiceId is required",
          });
        }

        // Verify receipt ownership
        const receipt = await db
          .select()
          .from(receipts)
          .where(and(eq(receipts.id, receiptId), eq(receipts.userId, userId)))
          .limit(1);

        if (receipt.length === 0) {
          return res.status(404).json({
            success: false,
            error: "Receipt not found",
          });
        }

        // Verify invoice ownership and existence
        const invoice = await db
          .select()
          .from(invoices)
          .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
          .limit(1);

        if (invoice.length === 0) {
          return res.status(404).json({
            success: false,
            error: "Invoice not found",
          });
        }

        // Attach receipt to invoice
        await db
          .update(receipts)
          .set({
            linkedInvoiceId: invoiceId,
            updatedAt: new Date(),
          })
          .where(eq(receipts.id, receiptId));

        // Log event
        await db.insert(materialCostEvents).values({
          receiptId,
          userId,
          action: "ATTACHED_TO_INVOICE",
          metadata: JSON.stringify({ invoiceId }),
        });

        return res.status(200).json({
          success: true,
          message: "Receipt attached to invoice.",
        });
      } catch (error) {
        console.error("[Material Costs] Attach error:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to attach receipt to invoice",
        });
      }
    }
  );

  /**
   * GET /api/material-costs
   * List all receipts for user
   */
  app.get("/api/material-costs", authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.userId;

      const userReceipts = await db
        .select()
        .from(receipts)
        .where(eq(receipts.userId, userId));

      return res.status(200).json({
        success: true,
        data: userReceipts.map((r) => ({
          ...r,
          items: r.items ? JSON.parse(r.items) : [],
        })),
      });
    } catch (error) {
      console.error("[Material Costs] List error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch receipts",
      });
    }
  });

  /**
   * GET /api/material-costs/:id
   * Get single receipt
   */
  app.get("/api/material-costs/:id", authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.userId;
      const receiptId = req.params.id;

      const receipt = await db
        .select()
        .from(receipts)
        .where(and(eq(receipts.id, receiptId), eq(receipts.userId, userId)))
        .limit(1);

      if (receipt.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Receipt not found",
        });
      }

      const r = receipt[0];
      return res.status(200).json({
        success: true,
        data: {
          ...r,
          items: r.items ? JSON.parse(r.items) : [],
        },
      });
    } catch (error) {
      console.error("[Material Costs] Get error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch receipt",
      });
    }
  });
}
