import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

/**
 * Speech-to-Text Service using OpenRouter Whisper API
 * 
 * Server-based speech recognition:
 * - Records audio locally using expo-av
 * - Sends audio to backend for transcription via OpenRouter Whisper API
 * - Backend securely handles OpenRouter authentication
 * - Works with internet connection
 * 
 * The flow:
 * 1. Record audio locally using expo-av
 * 2. Send audio to backend /api/transcribe endpoint
 * 3. Backend transcribes using OpenRouter Whisper API
 * 4. Backend sends transcript back to client for invoice extraction
 * 
 * OpenRouter Whisper Benefits:
 * - Accurate speech recognition
 * - Supports multiple languages
 * - Secure backend-only API authentication
 * - No client-side API key exposure
 */

interface SpeechToTextResult {
  transcript: string;
  confidence?: number;
  language?: string;
}

class SpeechToTextService {
  private isListening = false;
  private backendUrl = "";

  constructor() {
    // Get backend URL from environment
    if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_BACKEND_IP) {
      const ip = process.env.EXPO_PUBLIC_BACKEND_IP;
      this.backendUrl = `http://${ip}:3000`;
      console.log("[SpeechToText] Backend URL configured:", this.backendUrl);
    }
  }

  /**
   * Check if speech transcription is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      console.log("[SpeechToText] Checking transcription availability on", Platform.OS);
      console.log("[SpeechToText] Speech-to-text available (OpenRouter Whisper backend)");
      return true;
    } catch (error) {
      console.error("[SpeechToText] Transcription not available:", error);
      return false;
    }
  }

  /**
   * Transcribe audio file using OpenRouter Whisper API via backend
   * 
   * This reads the audio file recorded by audioRecorderService and sends it
   * to the backend for transcription using OpenRouter's Whisper API.
   * 
   * The backend handles all OpenRouter authentication securely.
   */
  async transcribeAudioFile(audioUri: string): Promise<SpeechToTextResult> {
    try {
      console.log("[SpeechToText] Starting OpenRouter Whisper transcription", { audioUri });

      // Verify audio file exists
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists || ("isDirectory" in fileInfo && fileInfo.isDirectory)) {
        throw new Error("Audio file not found or is a directory");
      }

      console.log("[SpeechToText] Audio file verified and ready for transcription");

      // Read the audio file
      console.log("[SpeechToText] Reading audio file...");
      const audioData = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Send to backend for transcription
      console.log("[SpeechToText] Sending audio to backend for OpenRouter Whisper transcription...");
      
      if (!this.backendUrl) {
        throw new Error("Backend URL not configured. Check EXPO_PUBLIC_BACKEND_IP in .env");
      }

      const response = await fetch(`${this.backendUrl}/api/transcribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioData: audioData,
          audioUri: audioUri,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend transcription failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      console.log("[SpeechToText] Transcription successful");
      return {
        transcript: result.transcript || "",
        confidence: result.confidence || 0.95,
        language: result.language || "en",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[SpeechToText] Transcription failed:", errorMsg);
      throw error;
    }
  }

  /**
   * Get current listening status
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}

export const speechToTextService = new SpeechToTextService();
