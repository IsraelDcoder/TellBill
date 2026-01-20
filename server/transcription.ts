import type { Express, Request, Response } from "express";
import fetch from "node-fetch";

const OPENROUTER_CHAT_URL =
  "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_WHISPER_URL =
  "https://openrouter.ai/api/v1/audio/transcriptions";

interface ExtractionError {
  error: string;
  code: string;
  status: number;
  raw?: string | null;
}

function getOpenRouterKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
  return key;
}

export async function extractInvoiceDataOpenRouter(
  transcript: string
): Promise<Record<string, any>> {
  const OPENROUTER_API_KEY = getOpenRouterKey();

  const prompt = `Extract invoice details from the following transcript of a construction/service job. Return ONLY valid JSON, no markdown.

TRANSCRIPT:
"${transcript}"

Return ONLY this JSON structure:
{
  "clientName": "client company name or 'Unnamed Client'",
  "clientEmail": "email or empty string",
  "clientPhone": "phone or empty string",
  "jobAddress": "job location or 'Not specified'",
  "jobDescription": "description of work done",
  "materials": "List of materials line by line: '2 lumber at $50, 10 nails at $2'",
  "laborHours": 8,
  "laborRate": 50,
  "safetyNotes": "any safety notes mentioned",
  "paymentTerms": "payment terms mentioned or 'Net 30'",
  "subtotal": 0,
  "taxRate": 0.08,
  "tax": 0,
  "total": 0,
  "notes": "any additional notes"
}`;

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at extracting construction job and invoice information from voice transcripts. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.0,
      max_tokens: 1000,
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw {
      error: "OpenRouter extraction failed",
      code: "EXTRACTION_FAILED",
      status: response.status,
      raw: responseText,
    } as ExtractionError;
  }

  const data = JSON.parse(responseText);
  const content = data.choices?.[0]?.message?.content ?? "";

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse JSON from OpenRouter response");
  }

  return JSON.parse(jsonMatch[0]);
}

export function registerTranscriptionRoutes(app: Express): void {
  app.post("/api/extract-invoice", async (req: Request, res: Response) => {
    try {
      const { transcript } = req.body;

      if (!transcript) {
        return res.status(400).json({
          error: "Missing transcript",
          code: "MISSING_TRANSCRIPT",
        });
      }

      const result = await extractInvoiceDataOpenRouter(transcript);
      return res.json(result);
    } catch (error: any) {
      return res.status(error.status || 500).json({
        error: error.error || error.message || "Extraction failed",
        code: error.code || "INTERNAL_ERROR",
        raw: error.raw || null,
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

      console.log("[Transcription] Transcribing audio via OpenRouter Whisper...");

      const OPENROUTER_API_KEY = getOpenRouterKey();

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioData, "base64");

      // Create FormData for Whisper API
      const formData = new FormData();
      formData.append("file", new Blob([audioBuffer], { type: "audio/m4a" }), "audio.m4a");
      formData.append("model", "openai/whisper-1");

      const response = await fetch(OPENROUTER_WHISPER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: formData,
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error("[Transcription] Whisper API error:", responseText);
        return res.status(response.status).json({
          error: "Whisper transcription failed",
          code: "TRANSCRIPTION_FAILED",
          raw: responseText,
        });
      }

      const data = JSON.parse(responseText);

      console.log("[Transcription] Transcription successful");
      return res.json({
        transcript: data.text || "",
        confidence: 0.95,
        language: "en",
      });
    } catch (error: any) {
      console.error("[Transcription] Error:", error);
      return res.status(500).json({
        error: error.message || "Transcription failed",
        code: "INTERNAL_ERROR",
      });
    }
  });
}
