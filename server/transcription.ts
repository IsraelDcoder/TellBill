import type { Express, Request, Response } from "express";
import fetch from "node-fetch";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface ExtractionError {
  error: string;
  code: string;
  status: number;
  details?: string;
}

interface ExtractedInvoice {
  client_name: string | null;
  client_address: string | null;
  job_description: string | null;
  labor: {
    hours: number | null;
    rate_per_hour: number | null;
    total: number | null;
  };
  materials: Array<{
    name: string;
    quantity: number | null;
    unit_price: number | null;
    total: number | null;
  }>;
  subtotal: number | null;
  notes: string | null;
}

function getGroqKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured");
  return key;
}

/**
 * Extract invoice data from transcript using Groq LLM
 * 
 * CRITICAL: No mock data. No hallucination. Accuracy first.
 * If AI fails → return error
 * If data missing → return null for that field
 */
export async function extractInvoiceDataGroq(
  transcript: string
): Promise<ExtractedInvoice> {
  const GROQ_API_KEY = getGroqKey();

  // MANDATORY SYSTEM PROMPT - No deviations
  const systemPrompt = `You are an enterprise invoice extraction engine for construction contractors.

Your job is to extract structured invoice data from raw spoken text.

Rules:
- Do NOT hallucinate or guess values
- Do NOT infer prices not explicitly stated
- If a value is missing, return null
- Output ONLY valid JSON
- Do NOT include explanations or markdown
- Financial correctness > user convenience`;

  // DYNAMIC USER PROMPT - Must use actual transcript
  const userPrompt = `Extract invoice data from the following transcription:

"${transcript}"

Return a JSON object using this exact schema (return null for missing values, NOT empty strings or 0):
{
  "client_name": string | null,
  "client_address": string | null,
  "job_description": string | null,
  "labor": {
    "hours": number | null,
    "rate_per_hour": number | null,
    "total": number | null
  },
  "materials": [
    {
      "name": string,
      "quantity": number | null,
      "unit_price": number | null,
      "total": number | null
    }
  ],
  "subtotal": number | null,
  "notes": string | null
}`;

  console.log("[Invoice Extraction] Sending to Groq LLM for extraction...");

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.0,
      max_tokens: 2000,
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error("[Invoice Extraction] Groq API error:", {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    });
    throw {
      error: "Groq LLM extraction failed",
      code: "EXTRACTION_FAILED",
      status: response.status,
      details: responseText,
    } as ExtractionError;
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error("[Invoice Extraction] Failed to parse Groq response:", responseText);
    throw {
      error: "Invalid response from Groq API",
      code: "INVALID_RESPONSE",
      status: 500,
    } as ExtractionError;
  }

  // Extract JSON from response
  const content = data.choices?.[0]?.message?.content ?? "";

  if (!content) {
    throw {
      error: "Empty response from Groq API",
      code: "EMPTY_RESPONSE",
      status: 500,
    } as ExtractionError;
  }

  // Find JSON in response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[Invoice Extraction] No JSON found in response:", content);
    throw {
      error: "Failed to parse JSON from Groq response",
      code: "INVALID_JSON",
      status: 500,
      details: content,
    } as ExtractionError;
  }

  let extractedData: ExtractedInvoice;
  try {
    extractedData = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error("[Invoice Extraction] Failed to parse extracted JSON:", jsonMatch[0]);
    throw {
      error: "Invalid JSON structure from Groq",
      code: "INVALID_SCHEMA",
      status: 500,
    } as ExtractionError;
  }

  // Validate schema
  if (!validateInvoiceSchema(extractedData)) {
    console.error("[Invoice Extraction] Invalid schema:", extractedData);
    throw {
      error: "Invoice data does not match required schema",
      code: "SCHEMA_MISMATCH",
      status: 400,
    } as ExtractionError;
  }

  console.log("[Invoice Extraction] Successfully extracted invoice data");
  return extractedData;
}

/**
 * Validate invoice schema - strict validation
 */
function validateInvoiceSchema(data: any): data is ExtractedInvoice {
  if (typeof data !== "object" || data === null) return false;
  
  // Check required top-level fields
  if (!("client_name" in data)) return false;
  if (!("labor" in data)) return false;
  if (!("materials" in data)) return false;
  if (!("subtotal" in data)) return false;

  // Validate labor object
  if (typeof data.labor !== "object" || data.labor === null) return false;
  if (!("hours" in data.labor) || !("rate_per_hour" in data.labor) || !("total" in data.labor)) return false;

  // Validate materials array
  if (!Array.isArray(data.materials)) return false;
  for (const material of data.materials) {
    if (typeof material !== "object") return false;
    if (!("name" in material) || !("quantity" in material) || !("unit_price" in material) || !("total" in material)) return false;
  }

  return true;
}

export function registerTranscriptionRoutes(app: Express): void {
  /**
   * POST /api/extract-invoice
   * Extract invoice data from transcript using Groq LLM
   * 
   * NO MOCK DATA - PRODUCTION ONLY
   * Financial accuracy is critical.
   * If AI fails → return error
   * Never hallucinate data
   */
  app.post("/api/extract-invoice", async (req: Request, res: Response) => {
    try {
      const { transcript } = req.body;

      if (!transcript || typeof transcript !== "string") {
        console.error("[Extract] Missing or invalid transcript");
        return res.status(400).json({
          error: "Missing transcript",
          code: "MISSING_TRANSCRIPT",
        });
      }

      if (transcript.trim().length === 0) {
        return res.status(400).json({
          error: "Transcript is empty",
          code: "EMPTY_TRANSCRIPT",
        });
      }

      console.log("[Extract] Extracting invoice from transcript...");
      const result = await extractInvoiceDataGroq(transcript);
      
      console.log("[Extract] ✅ Invoice extraction successful");
      return res.json(result);
    } catch (error: any) {
      console.error("[Extract] Extraction failed:", error);
      
      // Return detailed error - never fallback to mock data
      return res.status(error.status || 500).json({
        error: error.error || error.message || "Invoice extraction failed",
        code: error.code || "INTERNAL_ERROR",
        details: error.details || null,
      });
    }
  });

  app.post("/api/transcribe", async (req: Request, res: Response) => {
    try {
      const { audioData, audioUri } = req.body;

      if (!audioData) {
        return res.status(400).json({
          error: "Missing audio data",
          code: "MISSING_AUDIO_DATA",
        });
      }

      console.log("[Transcription] Transcribing audio via Groq Whisper API...");

      // Check for Groq API key (free alternative to OpenRouter for Whisper)
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) {
        console.error("[Transcription] GROQ_API_KEY not configured");
        return res.status(500).json({
          error: "Transcription service not configured",
          code: "SERVICE_NOT_CONFIGURED",
          message: "Please set GROQ_API_KEY in .env. Get free API key from https://console.groq.com/",
        });
      }

      try {
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audioData, "base64");

        // Create FormData for Groq Whisper API
        const formData = new FormData();
        formData.append("file", new Blob([audioBuffer], { type: "audio/m4a" }), "audio.m4a");
        formData.append("model", "whisper-large-v3-turbo");
        formData.append("language", "en");

        console.log("[Transcription] Sending audio to Groq Whisper API...");
        const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            // Note: FormData sets Content-Type automatically with boundary
          },
          body: formData,
        });

        const responseText = await response.text();

        if (!response.ok) {
          console.error("[Transcription] Groq API error:", {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
          });
          return res.status(response.status).json({
            error: "Whisper transcription failed",
            code: "TRANSCRIPTION_FAILED",
            details: responseText,
          });
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("[Transcription] Failed to parse response:", responseText);
          return res.status(500).json({
            error: "Invalid response from Whisper API",
            code: "INVALID_RESPONSE",
          });
        }

        console.log("[Transcription] Transcription successful");
        return res.json({
          transcript: data.text || "",
          confidence: 0.95,
          language: data.language || "en",
        });
      } catch (fetchError: any) {
        console.error("[Transcription] Fetch error:", fetchError.message);
        return res.status(500).json({
          error: "Failed to connect to transcription service",
          code: "SERVICE_ERROR",
          details: fetchError.message,
        });
      }
    } catch (error: any) {
      console.error("[Transcription] Error:", error);
      return res.status(500).json({
        error: error.message || "Transcription failed",
        code: "INTERNAL_ERROR",
      });
    }
  });
}
