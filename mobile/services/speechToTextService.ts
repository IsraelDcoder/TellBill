import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Speech-to-Text Service using Groq Whisper API
 * 
 * On-device speech recognition:
 * - Uses native voice recognition APIs (Android: Google Speech Recognizer, iOS: AVSpeechRecognizer)
 * - Fallback to Groq Whisper API via backend for accurate transcription
 * - Works with audio files recorded by audioRecorderService
 * 
 * The flow:
 * 1. Record audio locally using expo-audio
 * 2. Send audio to backend /api/transcribe endpoint
 * 3. Backend transcribes using Groq Whisper API (free tier available)
 * 4. Backend sends transcript back to client for invoice extraction
 * 
 * Benefits:
 * - On-device transcription capability via native APIs
 * - Free Groq API for fallback (https://console.groq.com)
 * - Highly accurate Whisper transcription
 * - Secure backend-only API authentication
 * - Multiple language support
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
      
      // Check if we have backend URL for transcription
      if (this.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL) {
        console.log("[SpeechToText] Speech-to-text available (OpenRouter Whisper backend)");
        return true;
      }
      
      console.log("[SpeechToText] No backend configured for transcription");
      return false;
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
      
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || this.backendUrl;
      if (!backendUrl) {
        throw new Error("Backend URL not configured. Check EXPO_PUBLIC_BACKEND_URL in .env");
      }

      // Get auth token
      const authToken = await AsyncStorage.getItem("authToken");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${backendUrl}/api/transcribe`, {
        method: "POST",
        headers,
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

  /**
   * Cleanup resources
   */
  destroy() {
    // No resources to clean up (Voice library removed)
    console.log("[SpeechToText] Service cleanup complete");
  }
}

export const speechToTextService = new SpeechToTextService();
