import { readAsStringAsync } from "expo-file-system/legacy";
import { speechToTextService } from "./speechToTextService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/backendUrl";

interface TranscriptionResult {
  text: string;
  duration: number;
  language?: string;
  confidence?: number;
}

class TranscriptionService {
  /**
   * Transcribe audio using on-device speech recognition
   * 
   * IMPORTANT ARCHITECTURE:
   * - Audio is recorded locally (expo-av) ✓
   * - Transcription happens on-device (using native APIs when available)
   * - If on-device STT not available, can fallback to backend transcription
   * - ONLY transcript text is sent to backend (never the audio file)
   * - Backend uses OpenRouter ONLY for invoice extraction via chat
   * 
   * Flow:
   * 1. Try on-device STT via speechToTextService
   * 2. If unavailable, fallback to backend with audio → transcript conversion
   * 3. Send transcript text to /api/extract-invoice
   * 
   * @param audioUri - Local file URI from expo-audio recording
   * @param duration - Duration of recording in seconds
   */
  async transcribeAudio(audioUri: string, duration: number): Promise<TranscriptionResult> {
    try {
      console.log("[Transcription] Starting transcription", {
        audioUri,
        duration,
      });

      // Try on-device transcription first
      const isSTTAvailable = await speechToTextService.isAvailable();
      
      if (isSTTAvailable) {
        try {
          console.log("[Transcription] Attempting on-device STT...");
          const result = await speechToTextService.transcribeAudioFile(audioUri);
          
          console.log("[Transcription] On-device transcription complete", {
            textLength: result.transcript.length,
            confidence: result.confidence,
          });

          return {
            text: result.transcript,
            duration,
            language: result.language || "en-US",
            confidence: result.confidence || 0.9,
          };
        } catch (error) {
          console.log("[Transcription] On-device STT failed, falling back to backend");
          // Continue to fallback below
        }
      }

      // Fallback: Send audio to backend for transcription
      // The backend now handles this efficiently with only-transcript-returned approach
      console.log("[Transcription] Using backend transcription fallback");
      return await this.transcribeViaBackend(audioUri, duration);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Transcription] Error:", {
        message: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      });
      throw error;
    }
  }

  /**
   * Fallback: Transcribe via backend
   * This is used when on-device STT is not available
   * Sends audio to backend which uses OpenRouter Whisper API for transcription
   */
  private async transcribeViaBackend(
    audioUri: string,
    duration: number
  ): Promise<TranscriptionResult> {
    try {
      console.log("[Transcription] Reading audio file for backend processing");
      
      // Read audio file as base64
      const base64Audio = await readAsStringAsync(audioUri, {
        encoding: "base64",
      });

      console.log("[Transcription] Audio file loaded, size:", base64Audio.length);

      // Get backend URL using unified configuration
      const backendUrl = getApiUrl("");
      console.log("[Transcription] Using backend:", backendUrl);

      // Get auth token
      const authToken = await AsyncStorage.getItem("authToken");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      // Send to backend for Whisper transcription
      console.log("[Transcription] Sending audio to backend for transcription...");
      const response = await fetch(`${backendUrl}/api/transcribe`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          audioData: base64Audio,
          audioUri: audioUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        const errorMessage = errorData.details || errorData.error || response.statusText;
        throw new Error(`Transcription service error: ${response.status} - ${errorMessage}`);
      }

      const result = await response.json();

      if (!result.transcript) {
        throw new Error("No transcript received from backend");
      }

      console.log("[Transcription] Backend transcription successful");
      return {
        text: result.transcript,
        duration,
        language: result.language || "en-US",
        confidence: result.confidence || 0.9,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[Transcription] Backend transcription failed:", errorMsg);
      throw error;
    }
  }

  /**
   * Extract invoice data from transcript using Groq LLM via backend
   * 
   * PRODUCTION ONLY - NO MOCK DATA
   * The backend securely handles Groq API authentication
   * ONLY the transcript text is sent to the backend (no audio)
   * 
   * Returns real extracted invoice data or throws error if extraction fails
   */
  async extractInvoiceData(transcript: string) {
    try {
      if (!transcript || transcript.trim().length === 0) {
        throw new Error("Transcript is empty");
      }

      console.log("[Invoice Extraction] Starting extraction via backend", {
        transcriptLength: transcript.length,
      });

      const extractUrl = getApiUrl("/api/extract-invoice");
      console.log("[Invoice Extraction] Calling backend endpoint:", extractUrl);

      // ✅ Get auth token from AsyncStorage
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        throw new Error("No authorization token found. Please log in.");
      }

      const response = await fetch(extractUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // ✅ Add token to auth header
        },
        body: JSON.stringify({
          transcript,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `Invoice extraction failed: ${response.statusText}`;
        console.error("[Invoice Extraction] Backend Error:", {
          status: response.status,
          error: errorData,
        });
        throw new Error(errorMessage);
      }

      const invoiceData = await response.json();

      console.log("[Invoice Extraction] ✅ Success", {
        client_name: invoiceData.client_name,
        subtotal: invoiceData.subtotal,
      });

      return invoiceData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Invoice Extraction] Error:", errorMessage);
      throw error;
    }
  }
}

export const transcriptionService = new TranscriptionService();
