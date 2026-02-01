/**
 * Receipt Processing Service
 * Handles receipt photo capture, AI extraction, and activity creation
 */

import { v4 as uuidv4 } from 'uuid';

interface ExtractedReceipt {
  vendor: string;
  date: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  grand_total: number;
}

interface ReceiptMetadata {
  receipt_id: string;
  project_id: string;
  photo_url: string;
  vendor: string;
  date: string;
  grand_total: number;
  items: string; // JSON stringified
  extracted_at: string;
  activity_id?: string;
  status: 'pending' | 'extracting' | 'extracted' | 'created' | 'failed';
  error?: string;
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3000";

export class ReceiptProcessingService {
  /**
   * Upload receipt photo to backend for processing
   */
  static async uploadReceipt(
    projectId: string,
    photoBase64: string
  ): Promise<{ success: boolean; receiptId?: string; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/api/receipts/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          photoBase64,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          error: error?.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        receiptId: data.receiptId,
      };
    } catch (error) {
      console.error("[ReceiptService] Upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  /**
   * Extract data from receipt using Vision AI
   */
  static async extractReceiptData(
    photoUrl: string
  ): Promise<{ success: boolean; data?: ExtractedReceipt; error?: string }> {
    try {
      // Fetch image and convert to base64
      const imageResponse = await fetch(photoUrl);
      const blob = await imageResponse.blob();
      const base64Image = await this.blobToBase64(blob);
      const base64Data = base64Image.split(",")[1]; // Remove data:image/jpeg;base64, prefix

      // Call OpenRouter Vision API
      const visionResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4-vision",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: this.getExtractionPrompt(),
                },
                {
                  type: "image",
                  image: {
                    url: `data:image/jpeg;base64,${base64Data}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!visionResponse.ok) {
        const error = await visionResponse.json().catch(() => ({}));
        return {
          success: false,
          error: error?.error?.message || "Vision AI failed",
        };
      }

      const visionData = await visionResponse.json();
      const extractedText =
        visionData.choices?.[0]?.message?.content || "{}";

      // Parse JSON response
      const extracted = JSON.parse(extractedText);

      return {
        success: true,
        data: {
          vendor: extracted.vendor || "Unknown Vendor",
          date: extracted.date || new Date().toISOString().split("T")[0],
          items: extracted.items || [],
          grand_total: extracted.grand_total || 0,
        },
      };
    } catch (error) {
      console.error("[ReceiptService] Extraction error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Extraction failed",
      };
    }
  }

  /**
   * Check for duplicate receipts
   */
  static async checkForDuplicates(
    projectId: string,
    vendor: string,
    amount: number,
    date: string
  ): Promise<{ isDuplicate: boolean; existingReceiptId?: string }> {
    try {
      const response = await fetch(
        `${API_URL}/api/receipts/check-duplicate?projectId=${projectId}&vendor=${vendor}&amount=${amount}&date=${date}`
      );

      if (!response.ok) {
        return { isDuplicate: false };
      }

      const data = await response.json();
      return {
        isDuplicate: data.isDuplicate,
        existingReceiptId: data.receiptId,
      };
    } catch (error) {
      console.error("[ReceiptService] Duplicate check error:", error);
      return { isDuplicate: false };
    }
  }

  /**
   * Create activity from extracted receipt
   */
  static async createActivityFromReceipt(
    projectId: string,
    receiptId: string,
    extracted: ExtractedReceipt,
    visibleToClient: boolean = true
  ): Promise<{ success: boolean; activityId?: string; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/api/receipts/create-activity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          receiptId,
          vendor: extracted.vendor,
          items: extracted.items,
          total: extracted.grand_total,
          date: extracted.date,
          visibleToClient,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          error: error?.message || "Failed to create activity",
        };
      }

      const data = await response.json();
      return {
        success: true,
        activityId: data.activityId,
      };
    } catch (error) {
      console.error("[ReceiptService] Activity creation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Activity creation failed",
      };
    }
  }

  /**
   * Get extraction prompt for Vision AI
   */
  private static getExtractionPrompt(): string {
    return `You are a construction accounting assistant.

Extract the following from this receipt image:
1. Vendor name (e.g., "Home Depot", "Lowe's")
2. Date of purchase (YYYY-MM-DD format)
3. Itemized materials (name, quantity, unit price, total)
4. Grand total amount

Return ONLY valid JSON with this structure:
{
  "vendor": "string",
  "date": "YYYY-MM-DD",
  "items": [
    { "name": "string", "quantity": number, "unit_price": number, "total": number }
  ],
  "grand_total": number
}

Do not include explanations. Return only the JSON.`;
  }

  /**
   * Convert blob to base64
   */
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
