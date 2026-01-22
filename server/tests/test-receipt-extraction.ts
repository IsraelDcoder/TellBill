#!/usr/bin/env node

/**
 * Receipt Scanner - Vision AI Test
 * Tests the receipt extraction functionality with OpenRouter API
 * 
 * Usage:
 *   npx ts-node server/tests/test-receipt-extraction.ts [image-path]
 * 
 * Example with a test image:
 *   npx ts-node server/tests/test-receipt-extraction.ts test-data/receipt.jpg
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import axios from "axios";

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

async function testReceiptExtraction(imagePath: string): Promise<void> {
  console.log("🧾 Receipt Scanner - Vision AI Test\n");

  // Validate API key
  if (!OPENROUTER_API_KEY) {
    console.error("❌ Error: OPENROUTER_API_KEY not configured in .env");
    process.exit(1);
  }

  // Check if image file exists
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Error: Image file not found: ${imagePath}`);
    console.log("\n📝 To test with a real receipt:");
    console.log("   1. Place a receipt image in: test-data/receipt.jpg");
    console.log("   2. Run: npx ts-node server/tests/test-receipt-extraction.ts test-data/receipt.jpg");
    process.exit(1);
  }

  try {
    console.log("📸 Image Details:");
    const stats = fs.statSync(imagePath);
    console.log(`  Path: ${imagePath}`);
    console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`\n⏳ Extracting receipt data via OpenRouter Vision API...`);

    // Read and encode image
    const imageBuffer = fs.readFileSync(imagePath);
    const photoBase64 = imageBuffer.toString("base64");

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

    const startTime = Date.now();

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
        temperature: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const extractionTime = Date.now() - startTime;
    const content = response.data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from Vision AI");
    }

    // Parse JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const extracted: ExtractedReceipt = JSON.parse(jsonStr);

    console.log(`\n✅ Success! Extraction completed in ${extractionTime}ms\n`);

    // Display results
    console.log("📋 Extracted Data:");
    console.log(`  Vendor: ${extracted.vendor}`);
    console.log(`  Date: ${extracted.date}`);
    console.log(`  Items: ${extracted.items.length}`);
    console.log(`  Total: $${extracted.grandTotal.toFixed(2)}\n`);

    if (extracted.items.length > 0) {
      console.log("📦 Items:");
      extracted.items.forEach((item, index) => {
        console.log(
          `  ${index + 1}. ${item.name} (Qty: ${item.quantity}) @ $${item.unit_price.toFixed(2)}/ea = $${item.total.toFixed(2)}`
        );
      });
    }

    console.log("\n✨ Raw JSON Response:");
    console.log(JSON.stringify(extracted, null, 2));

    // API usage stats
    if (response.data.usage) {
      console.log("\n📊 API Usage:");
      console.log(`  Input tokens: ${response.data.usage.prompt_tokens}`);
      console.log(`  Output tokens: ${response.data.usage.completion_tokens}`);
      console.log(
        `  Total tokens: ${response.data.usage.total_tokens}`
      );
    }
  } catch (error: any) {
    console.error("\n❌ Extraction failed:\n");

    if (error.response?.status === 401) {
      console.error("Authentication Error: Invalid or missing OPENROUTER_API_KEY");
      console.error("Please check your .env file and ensure the key is valid.");
    } else if (error.response?.status === 429) {
      console.error("Rate Limit Error: Too many requests to OpenRouter API");
      console.error("Please wait before trying again.");
    } else if (error.response?.data?.error) {
      console.error(`Error: ${error.response.data.error.message}`);
    } else if (error.message) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Unknown error occurred");
    }

    console.error("\n📝 Troubleshooting:");
    console.log("  1. Verify OPENROUTER_API_KEY is set in .env");
    console.log("  2. Check API key at: https://openrouter.ai/keys");
    console.log("  3. Ensure image is clear and readable");
    console.log("  4. Try with a different receipt image");
    console.log("  5. Check OpenRouter API status: https://status.openrouter.ai");

    process.exit(1);
  }
}

// Run test
const imagePath = process.argv[2] || "test-data/receipt.jpg";
testReceiptExtraction(imagePath);
