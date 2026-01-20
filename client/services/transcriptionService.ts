import { readAsStringAsync } from "expo-file-system/legacy";
import { speechToTextService } from "./speechToTextService";

// ============================================================================
// BACKEND CONFIGURATION
// ============================================================================
// For Android/Mobile Expo Go: Use your computer's IP address, NOT localhost
// To find IP: Run 'ipconfig' on Windows, 'ifconfig' on Mac/Linux
// 
// DEV_IP: Your local machine IP (for development with Expo Go)
// PROD_URL: Production backend URL (for deployed app)
// ============================================================================

const DEV_IP = "10.64.118.139"; // Your computer's IP address
const DEV_PORT = 3000; // Your backend port
const PROD_URL = process.env.EXPO_PUBLIC_BACKEND_URL || null;

// Determine which URL to use
const getBackendUrl = (): string => {
  // Priority order:
  // 1. Environment variable (for production/special cases)
  // 2. Dev IP (for local testing)
  
  if (PROD_URL) {
    console.log("[Config] Using production backend URL:", PROD_URL);
    return PROD_URL;
  }

  const devUrl = `http://${DEV_IP}:${DEV_PORT}`;
  console.log("[Config] Using development backend:", devUrl);
  console.log("[Config] Note: This requires backend running at http://${DEV_IP}:${DEV_PORT}");
  return devUrl;
};

const BACKEND_URL = getBackendUrl();

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
   * Note: Backend route was removed, so this would need to be re-added if using fallback
   * For now, we'll throw an error directing users to set up native STT
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

      // NOTE: The /api/transcribe endpoint has been removed per requirements
      // To use backend transcription, you would need to:
      // 1. Set up a different endpoint that handles audio→transcript
      // 2. Or implement one of the native STT solutions:
      //    - react-native-google-speech-recognition
      //    - Google ML Kit (via @react-native-ml-kit packages)
      //    - Porcupine or similar on-device engines
      
      throw new Error(
        "Backend transcription endpoint removed. " +
        "Please implement on-device STT:\n" +
        "Option 1: npm install react-native-google-speech-recognition\n" +
        "Option 2: Integrate Google ML Kit speech recognition\n" +
        "Option 3: Implement native modules for iOS/Android"
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[Transcription] Backend transcription failed:", errorMsg);
      throw error;
    }
  }

  /**
   * Extract invoice data from transcript using backend OpenRouter API
   * The backend securely handles OpenRouter API authentication
   * ONLY the transcript text is sent to the backend (no audio)
   */
  async extractInvoiceData(transcript: string) {
    try {
      console.log("[Invoice Extraction] Starting extraction via backend", {
        transcriptLength: transcript.length,
        backendUrl: BACKEND_URL
      });

      const extractUrl = `${BACKEND_URL}/api/extract-invoice`;
      console.log("[Invoice Extraction] Calling backend endpoint:", extractUrl);
      
      const response = await fetch(extractUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

      console.log("[Invoice Extraction] Success", {
        clientName: invoiceData.clientName,
        total: invoiceData.total,
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
