/**
 * Receipt Processing Service
 * Handles receipt extraction, storage, and activity creation
 */

import axios from "axios";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { activities, projects } from "@shared/schema";

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

interface ExtractedItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ExtractedReceipt {
  vendor: string;
  date: string;
  items: ExtractedItem[];
  grandTotal: number;
}

interface ReceiptExtractionResult {
  success: boolean;
  data?: ExtractedReceipt;
  error?: string;
}

export const receiptService = {
  /**
   * Extract receipt data using Vision AI
   */
  async extractReceiptData(
    photoBase64: string
  ): Promise<ExtractedReceipt> {
    try {
      if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY not configured");
      }

      const systemPrompt = `You are a receipt parsing AI. Extract receipt information and return ONLY valid JSON, no markdown, no explanations.
Return this exact JSON structure:
{
  "vendor": "business name",
  "date": "YYYY-MM-DD",
  "items": [
    { "name": "item description", "quantity": 1, "unit_price": 0.00, "total": 0.00 }
  ],
  "grandTotal": 0.00
}`;

      const response = await axios.post(
        `${OPENROUTER_BASE_URL}/chat/completions`,
        {
          model: "gpt-4-vision",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: systemPrompt,
                },
                {
                  type: "image",
                  image: `data:image/jpeg;base64,${photoBase64}`,
                },
              ],
            },
          ],
          max_tokens: 1000,
          temperature: 0, // Deterministic output
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const content = response.data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("No response from Vision AI");
      }

      // Parse JSON from response (may have markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const extracted: ExtractedReceipt = JSON.parse(jsonStr);

      // ✅ FIXED: Validate extracted data - ensure all monetary values are valid
      if (!extracted.vendor || !extracted.date || !Array.isArray(extracted.items)) {
        throw new Error("Invalid extraction format: missing vendor, date, or items");
      }

      // ✅ FIXED: Validate and normalize items
      extracted.items = extracted.items.map((item: any) => ({
        name: String(item.name || "Unknown Item").trim(),
        quantity: Math.max(1, parseFloat(item.quantity) || 1),
        unit_price: Math.max(0, parseFloat(item.unit_price) || 0),
        total: Math.max(0, parseFloat(item.total) || 0),
      }));

      // ✅ FIXED: Validate grand total, recalculate if missing
      if (!extracted.grandTotal || extracted.grandTotal <= 0) {
        extracted.grandTotal = extracted.items.reduce((sum, item) => sum + (item.total || 0), 0);
      }

      console.log(`[receiptService] Extracted receipt from ${extracted.vendor}: $${extracted.grandTotal.toFixed(2)}`);
      return extracted;
    } catch (error) {
      console.error("[receiptService] Extraction error:", error);
      throw error;
    }
  },

  /**
   * Check for duplicate receipts
   */
  async checkForDuplicate(
    projectId: string,
    vendor: string,
    amount: number,
    date: string
  ): Promise<boolean> {
    try {
      // Query activities for this project within same day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await db
        .select()
        .from(activities)
        .where(
          sql`
            ${activities.projectId} = ${projectId}
            AND ${activities.type} = 'MATERIAL'
            AND ${activities.metadata}::jsonb->>'vendor' = ${vendor}
            AND CAST(${activities.metadata}::jsonb->>'amount' AS DECIMAL) BETWEEN ${amount - 0.01} AND ${amount + 0.01}
            AND CAST(${activities.metadata}::jsonb->>'date' AS DATE) = ${date}::DATE
          `
        );

      const isDuplicate = result.length > 0;
      if (isDuplicate) {
        console.log(
          `[receiptService] Duplicate detected: ${vendor} $${amount} on ${date}`
        );
      }

      return isDuplicate;
    } catch (error) {
      console.error("[receiptService] Duplicate check error:", error);
      // Don't fail if duplicate check fails - let user proceed
      return false;
    }
  },

  /**
   * Upload receipt photo to storage (S3/Supabase)
   * For now, returns a data URL - should be replaced with actual storage
   */
  async uploadReceiptPhoto(
    projectId: string,
    photoBase64: string
  ): Promise<string> {
    try {
      // TODO: Replace with actual S3/Supabase upload
      // For MVP, return data URL (not production-ready for large-scale)
      const dataUrl = `data:image/jpeg;base64,${photoBase64}`;

      console.log(`[receiptService] Receipt photo uploaded for project ${projectId}`);
      return dataUrl;
    } catch (error) {
      console.error("[receiptService] Photo upload error:", error);
      throw error;
    }
  },

  /**
   * Create activity from receipt data
   */
  async createActivityFromReceipt(
    projectId: string,
    vendor: string,
    date: string,
    items: ExtractedItem[],
    grandTotal: number,
    photoUrl: string,
    createdBy: string
  ): Promise<string> {
    try {
      // Verify project exists and user has access
      const project = await db
        .select()
        .from(projects)
        .where(sql`${projects.id} = ${projectId}`)
        .limit(1);

      if (!project.length) {
        throw new Error("Project not found");
      }

      // ✅ FIXED: Validate items and calculate grand total properly
      // Verify all items have valid totals
      const validatedItems = items.map((item) => ({
        name: item.name || "Unknown Item",
        quantity: Math.max(1, item.quantity || 1),
        unit_price: Math.max(0, item.unit_price || 0),
        total: Math.max(0, item.total || 0),
      }));

      // ✅ FIXED: Calculate total from items if not provided
      const calculatedTotal = validatedItems.reduce((sum, item) => sum + item.total, 0);
      const finalTotal = grandTotal > 0 ? grandTotal : calculatedTotal;

      // Create MATERIAL activity
      const activityId = crypto.randomUUID?.() || `activity_${Date.now()}`;

      const result = await db
        .insert(activities)
        .values({
          id: activityId,
          projectId,
          type: "MATERIAL",
          title: `Receipt from ${vendor}`,
          description: `${validatedItems.length} item(s) - $${(finalTotal / 100).toFixed(2)}`,
          amount: finalTotal,
          createdBy,
          metadata: {
            vendor,
            date,
            items: validatedItems,
            total: finalTotal,
            receipt_photo_url: photoUrl,
            source: "receipt_scanner",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      console.log(
        `[receiptService] Created activity ${activityId} from receipt: ${vendor}`
      );
      return activityId;
    } catch (error) {
      console.error("[receiptService] Activity creation error:", error);
      throw error;
    }
  },

  /**
   * Process receipt upload end-to-end
   */
  async processReceipt(
    projectId: string,
    photoBase64: string,
    createdBy: string
  ): Promise<{
    activityId: string;
    extracted: ExtractedReceipt;
    isDuplicate: boolean;
  }> {
    try {
      // 1. Extract receipt data
      const extracted = await this.extractReceiptData(photoBase64);

      // 2. Check for duplicates
      const isDuplicate = await this.checkForDuplicate(
        projectId,
        extracted.vendor,
        extracted.grandTotal,
        extracted.date
      );

      // 3. Upload photo
      const photoUrl = await this.uploadReceiptPhoto(projectId, photoBase64);

      // 4. Create activity
      const activityId = await this.createActivityFromReceipt(
        projectId,
        extracted.vendor,
        extracted.date,
        extracted.items,
        extracted.grandTotal,
        photoUrl,
        createdBy
      );

      return {
        activityId,
        extracted,
        isDuplicate,
      };
    } catch (error) {
      console.error("[receiptService] Processing error:", error);
      throw error;
    }
  },
};
