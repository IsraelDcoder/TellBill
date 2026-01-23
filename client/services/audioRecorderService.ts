import * as FileSystem from "expo-file-system";
// Using expo-av for audio recording (official Expo API)
// https://docs.expo.dev/versions/latest/sdk/audio/
import { Audio } from "expo-av";

interface RecordingSession {
  uri: string;
  duration: number;
  isReady: boolean;
}

export interface RecordingStatus {
  isInitialized: boolean;
  isRecording: boolean;
  hasMicPermission: boolean;
  error: string | null;
}

class AudioRecorderService {
  private recording: Audio.Recording | null = null;
  private isInitialized: boolean = false;
  private hasMicPermission: boolean = false;
  private currentError: string | null = null;
  private statusCallbacks: ((status: RecordingStatus) => void)[] = [];

  // Helper to detect if error is a permission error
  private isPermissionError(error: unknown): boolean {
    const errorStr = (error instanceof Error ? error.message : String(error)).toLowerCase();
    return (
      errorStr.includes("permission") ||
      errorStr.includes("denied") ||
      errorStr.includes("unauthorized")
    );
  }

  // Request microphone permission using OFFICIAL expo-av API
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      console.log("[AudioRecorder] Requesting microphone permission...");

      const { status } = await Audio.requestPermissionsAsync();
      console.log("[AudioRecorder] Permission request result:", { status });

      if (status === "granted") {
        this.hasMicPermission = true;
        this.currentError = null;
        console.log("[AudioRecorder] Microphone permission granted");
        return true;
      } else {
        this.hasMicPermission = false;
        this.currentError = "Microphone permission denied";
        console.log("[AudioRecorder] Permission denied:", status);
        throw new Error("Microphone permission denied. Please enable microphone access in settings.");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[AudioRecorder] Permission request failed:", errorMsg);
      this.hasMicPermission = false;
      this.currentError = errorMsg;
      return false;
    }
  }

  // Initialize the audio system (called once on app startup)
  async initialize() {
    try {
      // Skip if already initialized
      if (this.isInitialized) {
        console.log("[AudioRecorder] Audio system already initialized, skipping...");
        return;
      }

      console.log("[AudioRecorder] Initializing audio system...");
      
      // Request microphone permission first
      const hasPermission = await this.requestMicrophonePermission();
      
      if (!hasPermission) {
        throw new Error("Microphone permission not granted");
      }

      // Set audio mode for recording (OFFICIAL EXPO-AV API)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      this.isInitialized = true;
      this.currentError = null;
      console.log("[AudioRecorder] Audio system initialized successfully");
      this.notifyStatusChange();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[AudioRecorder] Initialization failed:", errorMsg);
      this.currentError = errorMsg;
      this.isInitialized = false;
      this.notifyStatusChange();
      throw error;
    }
  }

  async startRecording() {
    try {
      console.log("[AudioRecorder] Starting recording...");
      
      // Check if initialized
      if (!this.isInitialized) {
        throw new Error("Audio system not initialized. Call initialize() first.");
      }

      // Prevent multiple starts if already recording
      if (this.recording) {
        console.log("[AudioRecorder] Already recording, skipping start");
        return;
      }

      // Check microphone permission again before recording
      if (!this.hasMicPermission) {
        console.log("[AudioRecorder] Permission not set, requesting...");
        const hasPermission = await this.requestMicrophonePermission();
        if (!hasPermission) {
          throw new Error("Microphone permission not granted. Cannot start recording.");
        }
      }

      console.log("[AudioRecorder] Creating new Audio.Recording instance...");
      
      // Create new recording instance - OFFICIAL EXPO-AV API
      this.recording = new Audio.Recording();

      console.log("[AudioRecorder] Preparing recording with HIGH_QUALITY preset...");
      
      // Prepare the recording with official high quality preset
      await this.recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      console.log("[AudioRecorder] Calling startAsync()...");
      // Start recording - OFFICIAL METHOD
      await this.recording.startAsync();

      this.currentError = null;
      console.log("[AudioRecorder] Recording started successfully");
      this.notifyStatusChange();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[AudioRecorder] Failed to start recording:", errorMsg);
      this.currentError = errorMsg;
      this.recording = null;
      this.notifyStatusChange();
      throw error;
    }
  }

  async stopRecording(): Promise<RecordingSession | null> {
    try {
      if (!this.recording) {
        console.error("[AudioRecorder] No active recording");
        return null;
      }

      console.log("[AudioRecorder] Stopping recording...");
      
      // Stop and unload - OFFICIAL EXPO-AV METHOD
      await this.recording.stopAndUnloadAsync();
      const recordingUri = this.recording.getURI();

      if (!recordingUri) {
        console.error("[AudioRecorder] Recording URI is null");
        this.recording = null;
        return null;
      }

      // Get duration from status before clearing
      const status = await this.recording.getStatusAsync();
      const duration = status.durationMillis ? status.durationMillis / 1000 : 0;

      console.log(`[AudioRecorder] Recording stopped. URI: ${recordingUri}, Duration: ${duration}s`);

      // Clear the recording reference AFTER we've extracted all info
      this.recording = null;
      this.currentError = null;
      this.notifyStatusChange();

      return {
        uri: recordingUri,
        duration,
        isReady: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[AudioRecorder] Failed to stop recording:", errorMsg);
      this.recording = null; // Clear reference even on error
      this.currentError = errorMsg;
      this.notifyStatusChange();
      throw error;
    }
  }

  async deleteRecording(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      console.log("[AudioRecorder] Recording deleted:", uri);
    } catch (error) {
      console.error("[AudioRecorder] Delete error:", error);
    }
  }

  async getAudioFileSize(uri: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if ("size" in fileInfo && typeof fileInfo.size === "number") {
        return fileInfo.size;
      }
      return 0;
    } catch (error) {
      console.error("[AudioRecorder] Get file size error:", error);
      return 0;
    }
  }

  isRecording() {
    return this.recording !== null;
  }

  async cleanup(): Promise<void> {
    try {
      if (this.recording) {
        console.log("[AudioRecorder] Cleaning up recording...");
        // Check if recording is already stopped before trying to unload
        const status = await this.recording.getStatusAsync();
        if (status.isRecording) {
          // Only unload if still recording
          await this.recording.stopAndUnloadAsync();
        }
        this.recording = null;
      }
    } catch (error) {
      // Silently ignore errors during cleanup - recording may already be unloaded
      console.log("[AudioRecorder] Cleanup complete (recording was already cleaned up)");
      this.recording = null;
    }
  }

  // Get current recording status
  getStatus(): RecordingStatus {
    return {
      isInitialized: this.isInitialized,
      isRecording: this.isRecording(),
      hasMicPermission: this.hasMicPermission,
      error: this.currentError,
    };
  }

  // Subscribe to status changes
  onStatusChange(callback: (status: RecordingStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter((cb) => cb !== callback);
    };
  }

  private notifyStatusChange() {
    const status = this.getStatus();
    this.statusCallbacks.forEach((callback) => callback(status));
  }
}

export const audioRecorderService = new AudioRecorderService();
